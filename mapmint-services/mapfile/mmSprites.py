import os
import argparse
import PIL
import Image


def combine(input_files, output_file, fixed_height=None, quality=None):
    output_image_size = get_output_image_size(input_files, fixed_height)
    mode = Image.open(input_files[0]).mode
    sprites_image = Image.new(mode, output_image_size)

    x = 0
    for input_filename in input_files:
        image = Image.open(input_filename)
        (width, height) = image.size
        if fixed_height:
            (width, height) = calculate_new_image_size(width, height, fixed_height)
            image = image.resize((width, height), Image.ANTIALIAS)
        box = (x, 0, x + width, height)
        sprites_image.paste(image, box)
        x += width

    if quality:
        sprites_image.save(output_file, quality=quality)
    else:
        sprites_image.save(output_file)


def get_output_image_size(input_files, fixed_height=None):
    max_height = 0
    total_width = 0
    for input_filename in input_files:
        image = Image.open(input_filename)
        (width, height) = image.size
        if fixed_height:
            (width, height) = calculate_new_image_size(width, height, fixed_height)
        total_width += width
        if height > max_height:
            max_height = height
    return (total_width, max_height)


def calculate_new_image_size(width, height, new_height):
    new_width = int(width * (new_height * 1.0 / height))
    return (new_width, new_height)
