# -*- coding: utf-8 -*-
###############################################################################
#  Author:   Gérald Fenoy, gerald.fenoy@cartoworks.com
#  Copyright (c) 2010-2014, Cartoworks Inc. 
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

    def output_chunk(out, chunk_type, data):
        out["Result"]["value"] += struct.pack("!I", len(data))
        out["Result"]["value"] += chunk_type
        out["Result"]["value"] += data
        checksum = zlib.crc32(data, zlib.crc32(chunk_type))
        out["Result"]["value"] += struct.pack("!i", checksum)

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
                # TODO: confirm assumption: outputs is Python dictionary object
                if "Result1" not in outputs:
                    outputs["Result1"] = {"value": []}
                outputs["Result1"]["value"] += [[int(v * 255) for v in rgb_func(fx / fw, fy / fh)]]
                # print >> sys.stderr,outputs["Result1"]["value"]
        compressed = compressor.compress(data.tostring())
        flushed = compressor.flush()
        return compressed + flushed

    outputs["Result"]["value"] = struct.pack("8B", 137, 80, 78, 71, 13, 10, 26, 10)
    output_chunk(outputs, "IHDR", struct.pack("!2I5B", width, height, 8, 2, 0, 0, 0))
    output_chunk(outputs, "IDAT", get_data(width, height, rgb_func))
    output_chunk(outputs, "IEND", "")


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
                # print str(r) + ' '+ str(g) + ' '+ str(b)
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
    print(outputs, file=sys.stderr)
    return 3


def discretise(main, inputs, outputs):
    outputs["Result"]["value"] = _discretise([1.0, 1.1, 1.0, 2.0, 2.1, 2.4, 4.0],
                                             inputs['nbClasses']['value'],
                                             inputs['methode']['value'])
    return 3


def _discretise(data, nbc, method):
    print(sys.version, file=sys.stderr)
    print(sys.path, file=sys.stderr)
    import os
    print(os.environ, file=sys.stderr)
    import rpy2.robjects as robjects
    # the following lines are need only because of
    # strange issue specific to R displaying msg :
    # Loading required package: class
    try:
        sys.stdout.close()
    except:
        pass
    print("OK", file=sys.stderr)
    # The logic code
    robjects.r('library(e1071)')
    print("OK", file=sys.stderr)
    robjects.r('library(classInt)')
    print("OK", file=sys.stderr)
    robjects.r('data(jenks71)')
    print("OK", file=sys.stderr)
    tmp = data
    for i in range(len(tmp)):
        try:
            data[i] = float(tmp[i])
        except Exception as e:
            print(e, file=sys.stderr)
            data[i] = 0.0000066
    jenksData = robjects.FloatVector(data)
    print("OK", file=sys.stderr)
    ci = robjects.r.classIntervals
    print("OK", file=sys.stderr)
    nbClasses = int(nbc)
    print("OK", file=sys.stderr)
    print(str(data), file=sys.stderr)
    classes = ci(jenksData, n=nbClasses, style=method)
    print("OK", file=sys.stderr)
    trobj = classes.rx(-1)
    print("OK", file=sys.stderr)
    tval = tuple(trobj)
    print("OK", file=sys.stderr)
    res = []
    print("OK", file=sys.stderr)
    for i in range(0, len(tval[0])):
        if i != 0:
            res += [[tval[0][i - 1], tval[0][i]]]
    print("OK", file=sys.stderr)
    import json
    print("OK", file=sys.stderr)
    return json.dumps(res)
