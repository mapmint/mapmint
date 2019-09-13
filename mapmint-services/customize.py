import sys
import os

if sys.platform == 'win32':
    import ntfslink
    os.symlink = ntfslink.symlink
    os.readlink = ntfslink.readlink
    os.path.islink = ntfslink.islink
