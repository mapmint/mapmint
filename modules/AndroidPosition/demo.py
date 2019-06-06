import zoo
import sys


def defineLocation(conf, inputs, outputs):
    conf["senv"]["cPosition"] = inputs["lonlat"]["value"]
    outputs["Result"]["value"] = "Done"
    return zoo.SERVICE_SUCCEEDED


def getLocation(conf, inputs, outputs):
    import json
    polux = conf["senv"]["cPosition"].split(",")
    outputs["Result"]["value"] = json.dumps(polux)
    return zoo.SERVICE_SUCCEEDED
