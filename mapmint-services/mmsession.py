import zoo


def save(conf):
    try:
        _save(conf)
        fname = "sess_" + conf["senv"]["MMID"] + ".cfg"
        # TODO: confirm assumption: conf["main"] is a Python 3 dictionary object
        # if list(conf["main"].keys()).count("sessPath") > 0:
        if "sessPath" in conf["main"]:
            fullName = conf["main"]["sessPath"] + "/" + fname
        else:
            fullName = conf["main"]["tmpPath"] + "/" + fname
        f = open(fullName, "w")
        f.write("[senv]\n")
        for j in conf["senv"]:
            f.write(j + "=" + conf["senv"][j] + "\n")
        f.close()
        return zoo.SERVICE_SUCCEEDED
    except Exception as e:
        conf["lenv"]["message"] = "Error occured when trying to save session: " + str(e)
        return zoo.SERVICE_FAILED


def _save(conf):
    try:
        fname = "sess_" + conf["senv"]["MMID"] + "_1.cfg"
        # TODO: confirm assumption: conf["main"] is a Python 3 dictionary object
        # if list(conf["main"].keys()).count("sessPath") > 0:
        if "sessPath" in conf["main"]:
            fullName = conf["main"]["sessPath"] + "/" + fname
        else:
            fullName = conf["main"]["tmpPath"] + "/" + fname
        f = open(fullName, "w")
        f.write("[senv]\n")
        for j in conf["senv"]:
            f.write(j + "=" + conf["senv"][j] + "\n")
        f.close()
    except Exception as e:
        conf["lenv"]["message"] = "Error occured when trying to save session: " + str(e)
