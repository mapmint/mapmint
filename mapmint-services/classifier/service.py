# -*- coding: utf-8 -*-
###############################################################################
#  Author:   Gérald Fenoy, gerald.fenoy@geolabs.fr
#  Copyright (c) 2010-2019, Cartoworks Inc. 
############################################################################### 
#  Permission is hereby granted, free of charge, to any person obtaining a
#  copy of this software and associated documentation files (the "Software"),
#  to deal in the Software without restriction, including without limitation
#  the rights to use, copy, modify, merge, publish, distribute, sublicense,
#  and/or sell copies of the Software, and to permit persons to whom the
#  Software is furnished to do so, subject to the following conditions:
# 
#  The above copyright notice and this permission notice shall be included
#  in all copies or substantial portions of the Software.
# 
#  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
#  OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
#  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
#  THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
#  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
#  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
#  DEALINGS IN THE SOFTWARE.
################################################################################
import sys
import warnings

warnings.simplefilter("ignore", DeprecationWarning)


def write_png_in_mem(outputs, width, height, rgb_func):
    import zlib
    import struct
    import array

    def myCRC32(data):
        res=zlib.crc32(data) & 0xffffffff
        return str(res)

    def output_chunk(out, chunk_type0, data):
        chunk_type=bytes(chunk_type0,'utf-8')
        out["Result"]["value"] += struct.pack("!I", len(data))
        out["Result"]["value"] += chunk_type
        try:
            out["Result"]["value"] += data
        except Exception as e:
            zoo.error(str(e))
            out["Result"]["value"] += bytes(data,"utf-8")
        checksum0 =bytes( myCRC32(chunk_type),"utf-8") #zlib.crc32(chunk_type) & 0xffffffff
        checksum1 = zlib.crc32(data, int(myCRC32(chunk_type))) & 0xffffffff
        checksum = str(checksum1)
        try:
            out["Result"]["value"] += struct.pack("!L", int(checksum))
        except Exception as e:
            zoo.error(str(e))



    def get_data(width, height, rgb_func):
        fw = float(width)
        fh = float(height)
        compressor = zlib.compressobj()
        data = array.array("B")
        for y in range(height):
            data.append(0)
            fy = float(y)
            for x in range(width):
                fx = float(x)
                data.extend([int(v * 255) for v in rgb_func(fx / fw, fy / fh)])
                if "Result1" not in outputs:
                    outputs["Result1"] = {"value": []}
                outputs["Result1"]["value"] += [[int(v * 255) for v in rgb_func(fx / fw, fy / fh)]]
        compressed = compressor.compress(data.tostring())
        flushed = compressor.flush()
        return compressed + flushed

    outputs["Result"]["value"] = struct.pack("8B", 137, 80, 78, 71, 13, 10, 26, 10)
    output_chunk(outputs, "IHDR", struct.pack("!2I5B", width, height, 8, 2, 0, 0, 0))
    output_chunk(outputs, "IDAT", get_data(width, height, rgb_func))
    output_chunk(outputs, "IEND", bytes("","utf-8"))


def linear_gradient(start_value, stop_value, start_offset=0.0, stop_offset=1.0):
    return lambda offset: (start_value + (
            (offset - start_offset) / (stop_offset - start_offset) * (stop_value - start_value))) / 255.0


def gradient(DATA):
    def gradient_function(x, y):
        initial_offset = 0.0
        for offset, start, end in DATA:
            if y < offset:
                r = linear_gradient(start[0], end[0], initial_offset, offset)(y)
                g = linear_gradient(start[1], end[1], initial_offset, offset)(y)
                b = linear_gradient(start[2], end[2], initial_offset, offset)(y)
                return r, g, b
            initial_offset = offset

    return gradient_function


def getClassifierImage(conf, inputs, outputs):
    # Extract RGB components in hexa for 'from' and 'to' values
    RI = eval("0x" + inputs['from']['value'][0:2])
    GI = eval("0x" + inputs['from']['value'][2:4])
    BI = eval("0x" + inputs['from']['value'][4:6])
    RO = eval("0x" + inputs['to']['value'][0:2])
    GO = eval("0x" + inputs['to']['value'][2:4])
    BO = eval("0x" + inputs['to']['value'][4:6])
    # Produce the png and store it into outputs["Result"]["value"]
    nbClass = int(inputs['nbClass']['value'])
    lOutputs = {"Result": {"value": ""}}
    write_png_in_mem(lOutputs, 1, nbClass, gradient([
        (1.0, (RI, GI, BI), (RO, GO, BO)),
    ]))
    outputs["Result"] = lOutputs["Result"]
    outputs["Result"]["mimeType"] = "image/png"
    return 3


def discretise(main, inputs, outputs):
    outputs["Result"]["value"] = _discretise([1.0, 1.1, 1.0, 2.0, 2.1, 2.4, 4.0],
                                             inputs['nbClasses']['value'],
                                             inputs['methode']['value'])
    return 3


def _discretise(data, nbc, method):
    import os
    import rpy2.robjects as robjects
    # the following lines are need only because of
    # strange issue specific to R displaying msg :
    # Loading required package: class
    try:
        sys.stdout.close()
    except:
        pass
    # The logic code
    robjects.r('library(e1071)')
    robjects.r('library(classInt)')
    robjects.r('data(jenks71)')
    tmp = data
    for i in range(len(tmp)):
        try:
            data[i] = float(tmp[i])
        except Exception as e:
            zoo.error(str(e))
            data[i] = 0.0000066
    jenksData = robjects.FloatVector(data)
    ci = robjects.r.classIntervals
    nbClasses = int(nbc)
    classes = ci(jenksData, n=nbClasses, style=method)
    trobj = classes.rx(-1)
    tval = tuple(trobj)
    res = []
    for i in range(0, len(tval[0])):
        if i != 0:
            res += [[tval[0][i - 1], tval[0][i]]]
    import json
    return json.dumps(res)
