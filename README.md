# Electron SIGHT

Currently not much to it, just a demo of a slide viewer.

## Usage

    $ git clone ...
    $ npm install
    $ npm start

## Packaging

    $ npm run make

Generates packages for whatever platform you run it on.

On Linux, you need both `rpm` and `dpkg` build tools. On Ubuntu, for example, `sudo apt install rpm`.

## Creating DZI files

OpenSeaDragon (the underlying image viewer) uses the DeepZoom format (DZI). Images in various formats can be converted to DeepZoom by using `vips dzsave imagename.ext outfile`. Here vips is a command line utility which is part of [libvips](https://jcupitt.github.io/libvips/).
