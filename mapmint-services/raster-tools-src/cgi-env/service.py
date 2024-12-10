import zoo
import os, sys, shutil


def copyTileIndex(conf, inputs, outputs):
    dirs = os.listdir(inputs["InputDSTN"]["value"])
    lname = None
    for i in dirs:
        ii = i.split('.')
        zoo.info(str(ii) + " " + inputs["InputDSON"]["value"])
        if ii[0] == inputs["InputDSON"]["value"]:
            dirs = [inputs["InputDSTN"]["value"] + "/" + i]
            try:
                zoo.info(inputs["InputDSTN"]["value"] + "/" + i)
                zoo.info(inputs["InputDSTN"]["value"] + "/" + i)
                os.unlink(inputs["InputDSTN"]["value"] + "/" + i)
            except Exception as e:
                zoo.error(str(e))
                pass
            lname = ii[0]
            lfname = i
            break
    lname = inputs["InputDSON"]["value"]
    try:
        dirs = os.listdir(conf["main"]["tmpPath"] + "/TEMP_" + lname)
        for i in dirs:
            zoo.info(conf["main"]["tmpPath"] + "/TEMP_" + lname + "/" + i, conf["main"]["dataPath"] + "/dirs/" + inputs["idir"]["value"] + "/" + i)
            shutil.move(conf["main"]["tmpPath"] + "/TEMP_" + lname + "/" + i, conf["main"]["dataPath"] + "/dirs/" + inputs["idir"]["value"] + "/" + i)
            try:
                os.unlink(conf["main"]["dataPath"] + "/dirs/" + inputs["idir"]["value"] + "/ds_ows.map")
            except:
                pass
    except Exception as e:
        zoo.error(str(e))
        zoo.error(conf["main"]["tmpPath"] + "/TEMP_" + lfname + " " + dirs[0])
        shutil.move(conf["main"]["tmpPath"] + "/TEMP_" + lfname, dirs[0])
        try:
            os.unlink(dir[0].replace(lfname, "ds_ows.map"))
        except Exception as e:
            zoo.error(str(e))
            pass

        pass
    outputs["Result"]["value"] = zoo._("Tile Index moved")
    return 3
