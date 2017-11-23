from lxml import etree

class TitleTarget(object):
    def __init__(self):
        self.text = []
    def start(self, tag, attrib):
        self.is_title = True if tag == 'Layer' else False
    def end(self, tag):
        pass
    def data(self, data):
        if self.is_title:
            self.text.append(data.encode('utf-8'))
    def close(self):
        return self.text

# This and most other samples read in the Google copyright data
infile = 'tmp.xml'

context = etree.iterparse(infile, events=('end',), tag='{*}Layer')

for event, elem in context:
    try:
        print '%s <=> %s\n' % (elem.tag, elem.text.encode('utf-8'))
    except Exception,e:
        print '%s <=> %s\n' % (elem.tag, elem.text)
        print e
    elem.clear()
    while elem.getprevious() is not None:
        del elem.getparent()[0]

