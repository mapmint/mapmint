import zoo
import os, sys, shutil


def copyTileIndex(conf, inputs, outputs):
    dirs = os.listdir(inputs["InputDSTN"]["value"])
    lname = None
    for i in dirs:
        ii = i.split('.')
        print(str(ii) + " " + inputs["InputDSON"]["value"], file=sys.stderr)
        if ii[0] == inputs["InputDSON"]["value"]:
            dirs = [inputs["InputDSTN"]["value"] + "/" + i]
            try:
                print(inputs["InputDSTN"]["value"] + "/" + i, file=sys.stderr)
                print(inputs["InputDSTN"]["value"] + "/" + i, file=sys.stderr)
                os.unlink(inputs["InputDSTN"]["value"] + "/" + i)
            except Exception as e:
                print(e, file=sys.stderr)
                pass
            lname = ii[0]
            lfname = i
            break
    lname = inputs["InputDSON"]["value"]
    try:
        dirs = os.listdir(conf["main"]["tmpPath"] + "/TEMP_" + lname)
        for i in dirs:
            print(conf["main"]["tmpPath"] + "/TEMP_" + lname + "/" + i, conf["main"]["dataPath"] + "/dirs/" + inputs["idir"]["value"] + "/" + i, file=sys.stderr)
            shutil.move(conf["main"]["tmpPath"] + "/TEMP_" + lname + "/" + i, conf["main"]["dataPath"] + "/dirs/" + inputs["idir"]["value"] + "/" + i)
            try:
                os.unlink(conf["main"]["dataPath"] + "/dirs/" + inputs["idir"]["value"] + "/ds_ows.map")
            except:
                pass
    except Exception as e:
        print(e, file=sys.stderr)
        print(conf["main"]["tmpPath"] + "/TEMP_" + lfname + " " + dirs[0], file=sys.stderr)
        shutil.move(conf["main"]["tmpPath"] + "/TEMP_" + lfname, dirs[0])
        try:
            os.unlink(dir[0].replace(lfname, "ds_ows.map"))
        except Exception as e:
            print(e, file=sys.stderr)
            pass

        pass
    outputs["Result"]["value"] = zoo._("Tile Index moved")
    return 3
