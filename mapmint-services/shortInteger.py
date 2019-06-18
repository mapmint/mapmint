import random
import psycopg2
import authenticate.service as auth

# generate a random bit order
# you'll need to save this mapping permanently, perhaps just hardcode it
# map how ever many bits you need to represent your integer space
mapping = list(range(38))
mapping.reverse()
# random.shuffle(mapping)

# alphabet for changing from base 10
chars = 'abcdefghijklmnopqrstuvwxyz0123456789_-'


# shuffle the bits
def encode(n):
    result = 0
    for i, b in enumerate(mapping):
        b1 = 1 << i
        b2 = 1 << mapping[i]
        if n & b1:
            result |= b2
    return result


# unshuffle the bits
def decode(n):
    result = 0
    for i, b in enumerate(mapping):
        b1 = 1 << i
        b2 = 1 << mapping[i]
        if n & b2:
            result |= b1
    return result


# change the base
def enbase(x):
    n = len(chars)
    if x < n:
        return chars[x]
    return enbase(x / n) + chars[x % n]


# go back to base 10
def debase(x):
    n = len(chars)
    result = 0
    for i, c in enumerate(reversed(x)):
        result += chars.index(c) * (n ** i)
    return result


def unShortURL(conf, c):
    con = auth.getCon(conf)
    prefix = auth.getPrefix(conf)
    con = con.conn
    cur = con.cursor()
    try:
        import sys
        cur.execute("SELECT * from " + prefix + "savedpath where trace='" + c + "'")
        res = cur.fetchall()
        if len(res) == 0:
            raise
    except Exception as e:
        print(str(e), file=sys.stderr)
        raise
    d = debase(c)
    e = decode(d)
    return e


def shortURL(a):
    b = encode(a)
    c = enbase(b)
    return c

# test it out
# for a in range(400):
#    b = encode(a)
#    c = enbase(b)
#    d = debase(c)
#    e = decode(d)
#    while len(c) < 7:
#        c = ' ' + c
#    print '%6d %6d %s %6d %6d' % (a, b, c, d, e)
