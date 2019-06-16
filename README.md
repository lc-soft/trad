# Trad

## Introduction

**A lightweight and C based language for building user interfaces.**

Trad is:

- **Base on C:** Trad compiles to readable, standards-based C. Its relationship with C is like the relationship between TypeScript and JavaScript.
- **Optimized for UI:** Simplify your development work with syntax features specialized around the needs of user interface creation.
- **Easy to use:** Designed for C developers' usage habits, you can get started quickly without having to spend a lot of time reading complex documents.
- **Not Productive:** The current version of the architecture design has not been stable and is only used for technical communication, not for production.
- **Community-driven:** small size, easy to read and modify. Anyone can participate in the design of language specifications, and this project development status is affected by community activity.
- **Cross platform:** Support for Linux and Windows desktop platforms, but does not support Mac OS and mobile platforms

Trad's syntax is based on JavaScript, it has good compatibility with existing JavaScript development tools/editor extensions, and it won't change much for a long time, so you can temporarily write it as JavaScript.

![Example](images/example.gif)

## Installing

    npm install -g trad

## Usage

Compile to C source file:

    tradc example.jsx

Compile to binary file:

    gcc -c example.jsx.c
    gcc -o example example.jsx.o -lLCUI

**Note:** The UI layer of the Trad application is powered by [LCUI](https://github.com/lc-soft/LCUI) and you should install it before compiling.

The current version only implements the features required for the smallest sample application and cannot be applied to actual projects. Please wait for future updates.

## Contribute

There are many ways to [contribute](CONTRIBUTING.md) to Trad.

- [Submit bugs](https://github.com/lc-soft/trad/issues) and help us verify fixes as they are checked in.
- Vote and discuss participation in feature requests.
- Review the [source code changes](https://github.com/lc-soft/trad/pulls).
- [Contribute bug fixes](CONTRIBUTING.md).
- Read the [language specification](docs/README.md).

 Trad has adopted the code of conduct defined by the Contributor Covenant. This document is used across many open source communities, and we think it articulates our values well. For more, see the [Code of Conduct](CODE_OF_CONDUCT.md).

## Roadmap

The main tasks are listed below, for detailed work plans and progress please see the [project boards](https://github.com/lc-soft/trad/projects).

- Core
  - basic syntax
  - Basic data type
  - Compatible with C syntax
  - Template literals (Template strings)
  - Function nesting and Closures
  - Decorator
  - await/async
  - Standard library
- LCUI extension
  - Redesign language binding of LCUI
  - Implement the Widget.render() method
  - `@UIThread` decorator
- Tool chain
  - Compiler
    - Command-line interface
    - Friendly error output
    - Line comments
  - Package manager
  - Building tool
- Documention
  - FAQ
  - Lnaguage specification
  - Tutorial

## License

Trad is [MIT licensed](LICENSE).
