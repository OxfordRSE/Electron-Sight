# Electron SIGHT

Currently not much to it, just a demo of a slide viewer.

## Building

    $ git clone ...
    $ npm i -g yarn # see below
    $ yarn install

There used to be a bug in `node-gyp` related to how it determines whether you're on an Xcode version later than 5 (Xcode 6 was released in 2014, we're on 11 at time of writing), which causes a build failure. If you use `npm`, it runs its own version of `node-gyp`, which has this bug. If you use `yarn`, it uses the `node-gyp` from devDependencies, which doesn't have the bug.

Anyway, use `yarn`. If you're using homebrew on macOS, run `brew install yarn`. If not (or if you want to do the following anyway), use `npm i -g yarn`.

## Usage

    $ yarn start

## Packaging

Don't know yet, haven't tried.

## Creating DZI files

OpenSeaDragon (the underlying image viewer) uses the DeepZoom format (DZI). Images in various formats can be converted to DeepZoom by using `vips dzsave imagename.ext outfile`. Here vips is a command line utility which is part of [libvips](https://jcupitt.github.io/libvips/).
