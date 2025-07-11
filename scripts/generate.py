#!/usr/bin/env python3

# Requires Python 3.3+, the Python Pillow and NumPy packages, and
# nona (from Hugin). The Python pyshtools package is also needed for creating
# spherical-harmonic-transform previews (which are recommended).

# generate.py - A multires tile set generator for Pannellum
# Extensions to cylindrical input and partial panoramas by David von Oheimb
# Copyright (c) 2014-2024 Matthew Petroff
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

from __future__ import print_function

import argparse
from PIL import Image
import os
import sys
import math
import ast
from shutil import which as find_executable
import subprocess
import base64
import io
import numpy as np

# Allow large images (this could lead to a denial of service attack if you're
# running this script on user-submitted images.)
Image.MAX_IMAGE_PIXELS = None

# Find external programs
try:
    nona = find_executable('nona')
except KeyError:
    # Handle case of PATH not being set
    nona = None

# Handle Pillow deprecation
ANTIALIAS = Image.Resampling.LANCZOS if hasattr(Image, "Resampling") else Image.ANTIALIAS

genPreview = False
try:
    import pyshtools as pysh
    genPreview = True
except:
    sys.stderr.write("Unable to import pyshtools. Not generating SHT preview.\n")

b83chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~"
def b83encode(vals, length):
    result = ""
    for val in vals:
        for i in range(1, length + 1):
            result += b83chars[int(val // (83 ** (length - i))) % 83]
    return result

def img2shtHash(img, lmax=5):
    '''
    Create spherical harmonic transform (SHT) hash preview.
    '''
    def encodeFloat(f, maxVal):
        return np.maximum(0, np.minimum(2 * maxVal, np.round(np.sign(f) * np.sqrt(np.abs(f)) * maxVal + maxVal))).astype(int)

    def encodeCoeff(r, g, b, maxVal):
        quantR = encodeFloat(r / maxVal, 9)
        quantG = encodeFloat(g / maxVal, 9)
        quantB = encodeFloat(b / maxVal, 9)
        return quantR * 19 ** 2 + quantG * 19 + quantB

    # Calculate SHT coefficients
    r = pysh.expand.SHExpandDH(img[..., 0], sampling=2, lmax_calc=lmax)
    g = pysh.expand.SHExpandDH(img[..., 1], sampling=2, lmax_calc=lmax)
    b = pysh.expand.SHExpandDH(img[..., 2], sampling=2, lmax_calc=lmax)

    # Remove values above diagonal for both sine and cosine components
    # Also remove first row and column for sine component
    # These values are always zero
    r = np.append(r[0][np.tril_indices(lmax + 1)], r[1, 1:, 1:][np.tril_indices(lmax)])
    g = np.append(g[0][np.tril_indices(lmax + 1)], g[1, 1:, 1:][np.tril_indices(lmax)])
    b = np.append(b[0][np.tril_indices(lmax + 1)], b[1, 1:, 1:][np.tril_indices(lmax)])

    # Encode as string
    maxVal = np.max([np.max(r), np.max(b), np.max(g)])
    vals = encodeCoeff(r, g, b, maxVal).flatten()
    asstr = b83encode(vals, 2)
    lmaxStr = b83encode([lmax], 1)
    maxValStr = b83encode(encodeFloat([2 * maxVal / 255 - 1], 41), 1)
    return lmaxStr + maxValStr + asstr


# Subclass parser to add explaination for semi-option nona flag
class GenParser(argparse.ArgumentParser):
    def error(self, message):
        if '--nona' in message:
            sys.stderr.write('''IMPORTANT: The location of the nona utility (from Hugin) must be specified
           with -n, since it was not found on the PATH!\n\n''')
        super(GenParser, self).error(message)

# Parse input
parser = GenParser(description='Generate a Pannellum multires tile set from a full or partial equirectangular or cylindrical panorama.',
                   formatter_class=argparse.ArgumentDefaultsHelpFormatter)
parser.add_argument('inputFile', metavar='INPUT',
                    help='panorama to be processed')
parser.add_argument('-C', '--cylindrical', action='store_true',
                    help='input projection is cylindrical (default is equirectangular)')
parser.add_argument('-H', '--haov', dest='haov', default=-1, type=float,
                    help='horizontal angle of view (defaults to 360.0 for full panorama)')
parser.add_argument('-F', '--hfov', dest='hfov', default=100.0, type=float,
                    help='starting horizontal field of view (defaults to 100.0)')
parser.add_argument('-V', '--vaov', dest='vaov', default=-1, type=float,
                    help='vertical angle of view (defaults to 180.0 for full panorama)') 
parser.add_argument('-O', '--voffset', dest='vOffset', default=0.0, type=float,
                    help='starting pitch position (defaults to 0.0)')
parser.add_argument('-e', '--horizon', dest='horizon', default=0.0, type=int,
                    help='offset of the horizon in pixels (negative if above middle, defaults to 0)')
parser.add_argument('-o', '--output', dest='output', default='./output',
                    help='output directory, optionally to be used as basePath (defaults to "./output")')
parser.add_argument('-s', '--tilesize', dest='tileSize', default=512, type=int,
                    help='tile size in pixels')
parser.add_argument('-f', '--fallbacksize', dest='fallbackSize', default=1024, type=int,
                    help='fallback tile size in pixels (defaults to 1024, set to 0 to skip)')
parser.add_argument('-c', '--cubesize', dest='cubeSize', default=0, type=int,
                    help='cube size in pixels, or 0 to retain all details')
parser.add_argument('-b', '--backgroundcolor', dest='backgroundColor', default="[0.0, 0.0, 0.0]", type=str,
                    help='RGB triple of values [0, 1] defining background color shown past the edges of a partial panorama (defaults to "[0.0, 0.0, 0.0]")')
parser.add_argument('-B', '--avoidbackground', action='store_true',
                    help='viewer should limit view to avoid showing background, so using --backgroundcolor is not needed')
parser.add_argument('-a', '--autoload', action='store_true',
                    help='automatically load panorama in viewer')
parser.add_argument('-q', '--quality', dest='quality', default=75, type=int,
                    help='output JPEG quality 0-100')
parser.add_argument('--png', action='store_true',
                    help='output PNG tiles instead of JPEG tiles')
parser.add_argument('--thumbnailsize', dest='thumbnailSize', default=0, type=int,
                    help='width of equirectangular thumbnail preview (defaults to no thumbnail; must be power of two; >512 not recommended)')
parser.add_argument('-n', '--nona', default=nona, required=nona is None,
                    metavar='EXECUTABLE',
                    help='location of the nona executable to use')
parser.add_argument('-G', '--gpu', action='store_true',
                    help='perform image remapping by nona on the GPU')
parser.add_argument('-d', '--debug', action='store_true',
                    help='debug mode (print status info and keep intermediate files)')
args = parser.parse_args()


# Check argument
if args.thumbnailSize > 0:
    if args.thumbnailSize & (args.thumbnailSize - 1) != 0:
        print('Thumbnail size, if specified, must be a power of two')
        sys.exit(1)

# Create output directory
if os.path.exists(args.output):
    print('Output directory "' + args.output + '" already exists')
    if not args.debug:
        sys.exit(1)
else:
    os.makedirs(args.output)

# Process input image information
print('Processing input image information...')
origWidth, origHeight = Image.open(args.inputFile).size
haov = args.haov
if haov == -1:
    if args.cylindrical or float(origWidth) / origHeight == 2:
        print('Assuming --haov 360.0')
        haov = 360.0
    else:
        print('Unless given the --haov option, equirectangular input image must be a full (not partial) panorama!')
        sys.exit(1)
vaov = args.vaov
if vaov == -1:
    if args.cylindrical or float(origWidth) / origHeight == 2:
        print('Assuming --vaov 180.0')
        vaov = 180.0
    else:
        print('Unless given the --vaov option, equirectangular input image must be a full (not partial) panorama!')
        sys.exit(1)
if args.cubeSize != 0:
    cubeSize = args.cubeSize
else:
    cubeSize = 8 * int((360 / haov) * origWidth / math.pi / 8)
tileSize = min(args.tileSize, cubeSize)
levels = int(math.ceil(math.log(float(cubeSize) / tileSize, 2))) + 1
if int(cubeSize / 2**(levels - 2)) == tileSize:
    levels -= 1  # Handle edge case
origHeight = str(origHeight)
origWidth = str(origWidth)
origFilename = os.path.join(os.getcwd(), args.inputFile)
extension = '.jpg'
if args.png:
    extension = '.png'
partialPano = True if args.haov != -1 and args.vaov != -1 else False
colorList = ast.literal_eval(args.backgroundColor)
colorTuple = (int(colorList[0]*255), int(colorList[1]*255), int(colorList[2]*255))

# Don't generate preview for partial panoramas
if haov < 360 or vaov < 180:
    genPreview = False

if args.debug:
    print('maxLevel: '+ str(levels))
    print('tileResolution: '+ str(tileSize))
    print('cubeResolution: '+ str(cubeSize))

# Generate PTO file for nona to generate cube faces
# Face order: front, back, up, down, left, right
faceLetters = ['f', 'b', 'u', 'd', 'l', 'r']
projection = "f1" if args.cylindrical else "f4"
pitch = 0
text = []
facestr = 'i a0 b0 c0 d0 e'+ str(args.horizon) +' '+ projection + ' h' + origHeight +' w'+ origWidth +' n"'+ origFilename +'" r0 v' + str(haov)
text.append('p E0 R0 f0 h' + str(cubeSize) + ' w' + str(cubeSize) + ' n"TIFF_m" u0 v90')
text.append('m g1 i0 m2 p0.00784314')
text.append(facestr +' p' + str(pitch+ 0) +' y0'  )
text.append(facestr +' p' + str(pitch+ 0) +' y180')
text.append(facestr +' p' + str(pitch-90) +' y0'  )
text.append(facestr +' p' + str(pitch+90) +' y0'  )
text.append(facestr +' p' + str(pitch+ 0) +' y90' )
text.append(facestr +' p' + str(pitch+ 0) +' y-90')
text.append('v')
text.append('*')
text = '\n'.join(text)
with open(os.path.join(args.output, 'cubic.pto'), 'w') as f:
    f.write(text)

# Create cube faces
print('Generating cube faces...')
subprocess.check_call([args.nona, ('-g' if args.gpu else '-d') , '-o', os.path.join(args.output, 'face'), os.path.join(args.output, 'cubic.pto')])
faces = ['face0000.tif', 'face0001.tif', 'face0002.tif', 'face0003.tif', 'face0004.tif', 'face0005.tif']

# Generate tiles
print('Generating tiles...')
missingTiles = []
for f in range(0, 6):
    size = cubeSize
    faceExists = os.path.exists(os.path.join(args.output, faces[f]))
    if faceExists:
        face = Image.open(os.path.join(args.output, faces[f]))
        for level in range(levels, 0, -1):
            if not os.path.exists(os.path.join(args.output, str(level))):
                os.makedirs(os.path.join(args.output, str(level)))
            tiles = int(math.ceil(float(size) / tileSize))
            if (level < levels):
                face = face.resize([size, size], ANTIALIAS)
            for i in range(0, tiles):
                for j in range(0, tiles):
                    left = j * tileSize
                    upper = i * tileSize
                    right = min(j * args.tileSize + args.tileSize, size) # min(...) not really needed
                    lower = min(i * args.tileSize + args.tileSize, size) # min(...) not really needed
                    tile = face.crop([left, upper, right, lower])
                    if args.debug:
                        print('level: '+ str(level) + ' tiles: '+ str(tiles) + ' tileSize: ' + str(tileSize) + ' size: '+ str(size))
                        print('left: '+ str(left) + ' upper: '+ str(upper) + ' right: '+ str(right) + ' lower: '+ str(lower))
                    colors = tile.getcolors(1)
                    if not partialPano or colors == None or colors[0][1] != colorTuple:
                        # More than just one color (the background), i.e., non-empty tile
                        if tile.mode in ('RGBA', 'LA'):
                            background = Image.new(tile.mode[:-1], tile.size, colorTuple)
                            background.paste(tile, tile.split()[-1])
                            tile = background
                        colors = tile.getcolors(1)
                        if not genPreview and colors is not None and colors[0][1] == colorTuple:
                            missingTiles.append((f, level, j, i))
                        else:
                            tile.save(os.path.join(args.output, str(level), faceLetters[f] + str(i) + '_' + str(j) + extension), quality=args.quality)
                    else:
                        missingTiles.append((f, level, j, i))
            size = int(size / 2)
    else:
        missingTiles.append((f, level, 0, 0))

# Tell viewer not to load missing tiles
if len(missingTiles) > 0:
    # Remove children of missing tiles, since they won't be loaded anyway
    tilesToRemove = []
    for t in missingTiles:
        tilesToRemove.append((t[0], t[1] + 1, t[2] * 2, t[3] * 2))
        tilesToRemove.append((t[0], t[1] + 1, t[2] * 2, t[3] * 2 + 1))
        tilesToRemove.append((t[0], t[1] + 1, t[2] * 2 + 1, t[3] * 2))
        tilesToRemove.append((t[0], t[1] + 1, t[2] * 2 + 1, t[3] * 2 + 1))
    for t in tilesToRemove:
        if t in missingTiles:
            missingTiles.pop(missingTiles.index(t))
    # Encode missing tile list as string
    missingTilesStr = ''
    prevFace = prevLevel = None
    for missingTile in sorted(missingTiles):
        face = missingTile[0]
        level = missingTile[1]
        if face != prevFace:
            missingTilesStr += '!' + faceLetters[face]
        if level != prevLevel:
            missingTilesStr += '>' + b83encode([level], 1)
            maxTileNum = math.ceil(cubeSize / 2**(levels - level) / tileSize) - 1
            numTileDigits = math.ceil(math.log(maxTileNum + 1, 83))
        missingTilesStr += b83encode(missingTile[2:], numTileDigits)
        prevFace = face
        prevLevel = level

# Generate fallback tiles
if args.fallbackSize > 0:
    print('Generating fallback tiles...')
    for f in range(0, 6):
        if not os.path.exists(os.path.join(args.output, 'fallback')):
            os.makedirs(os.path.join(args.output, 'fallback'))
        if os.path.exists(os.path.join(args.output, faces[f])):
            face = Image.open(os.path.join(args.output, faces[f]))
            if face.mode in ('RGBA', 'LA'):
                background = Image.new(face.mode[:-1], face.size, colorTuple)
                background.paste(face, face.split()[-1])
                face = background
            face = face.resize([args.fallbackSize, args.fallbackSize], ANTIALIAS)
            face.save(os.path.join(args.output, 'fallback', faceLetters[f] + extension), quality = args.quality)

# Clean up temporary files
if not args.debug:
    os.remove(os.path.join(args.output, 'cubic.pto'))
    for face in faces:
        if os.path.exists(os.path.join(args.output, face)):
            os.remove(os.path.join(args.output, face))

# Generate preview (but not for partial panoramas)
if genPreview:
    # Generate SHT-hash preview
    shtHash = img2shtHash(np.array(Image.open(args.inputFile).resize((1024, 512))))
if args.thumbnailSize > 0:
    # Create low-resolution base64-encoded equirectangular preview image
    img = Image.open(args.inputFile)
    img = img.resize((args.thumbnailSize, args.thumbnailSize // 2))
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=75, optimize=True)
    equiPreview = bytes('data:image/jpeg;base64,', encoding='utf-8')
    equiPreview += base64.b64encode(buf.getvalue())
    equiPreview = equiPreview.decode()

# Generate config file
text = []
text.append('{')
text.append('    "hfov": ' + str(args.hfov)+ ',')
if haov < 360:
    text.append('    "haov": ' + str(haov)+ ',')
    text.append('    "minYaw": ' + str(-haov/2+0)+ ',')
    text.append('       "yaw": ' + str(-haov/2+args.hfov/2)+ ',')
    text.append('    "maxYaw": ' + str(+haov/2+0)+ ',')
if vaov < 180:
    text.append('    "vaov": '    + str(vaov)+ ',')
    text.append('    "vOffset": ' + str(args.vOffset)+ ',')
    text.append('    "minPitch": ' + str(-vaov/2+args.vOffset)+ ',')
    text.append('       "pitch": ' + str(        args.vOffset)+ ',')
    text.append('    "maxPitch": ' + str(+vaov/2+args.vOffset)+ ',')
if colorTuple != (0, 0, 0):
    text.append('    "backgroundColor": ' + args.backgroundColor+ ',')
if args.avoidbackground and (haov < 360 or vaov < 180):
    text.append('    "avoidShowingBackground": true,')
if args.autoload:
    text.append('    "autoLoad": true,')
text.append('    "type": "multires",')
text.append('    "multiRes": {')
if genPreview:
    text.append('        "shtHash": "' + shtHash + '",')
if args.thumbnailSize > 0:
    text.append('        "equirectangularThumbnail": "' + equiPreview + '",')
if len(missingTiles) > 0:
    text.append('        "missingTiles": "' + missingTilesStr + '",')
text.append('        "path": "/%l/%s%y_%x",')
if args.fallbackSize > 0:
    text.append('        "fallbackPath": "/fallback/%s",')
text.append('        "extension": "' + extension[1:] + '",')
text.append('        "tileResolution": ' + str(tileSize) + ',')
text.append('        "maxLevel": ' + str(levels) + ',')
text.append('        "cubeResolution": ' + str(cubeSize))
text.append('    }')
text.append('}')
text = '\n'.join(text)
with open(os.path.join(args.output, 'config.json'), 'w') as f:
    f.write(text)