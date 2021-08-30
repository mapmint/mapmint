def demo(conf, inputs, outputs):
    import zoo, time
    i = 0
    while i < 100:
        conf["lenv"]["message"] = "Step " + str(i)
        zoo.update_status(conf, i)
        time.sleep(0.5)
        i += 1
    conf["lenv"]["message"] = zoo._("Error executing the service")
    return zoo.SERVICE_FAILED


def demo1(conf, inputs, outputs):
    conf["lenv"]["message"] = zoo._("Error executing the service")
    return zoo.SERVICE_FAILED
