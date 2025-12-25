# How to manage default applications on macOS

This guide explains how to check and change the default application for a specific file type using the command-line tool `duti`.

## Prerequisites

You need to have [Homebrew](https://brew.sh/) installed on your system.

## Installation

If you don't have `duti` installed, you can install it using Homebrew:

```bash
brew install duti
```

## Check the default application

To check the default application for a specific file extension (e.g., `.jpg`), use the following command:

```bash
duti -x jpg
```

This will output the name, path, and bundle identifier of the default application.

## Change the default application

To change the default application for a specific file extension, you first need to find the bundle identifier of the application you want to set as the default.

You can usually find the bundle identifier by looking at the application's `Info.plist` file, or by searching online.

Once you have the bundle identifier, you can use the following command to set the default application (e.g., setting "CleanShot X" as the default for `.jpg` files):

```bash
duti -s com.getcleanshot.app-setapp jpg all
```

Replace `com.getcleanshot.app-setapp` with the bundle identifier of your desired application and `jpg` with the file extension. The `all` parameter ensures that the application is set as the default for all roles (viewer, editor, etc.). While `all` is the default, being explicit can be more reliable.
