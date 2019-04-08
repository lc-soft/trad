# Class

The translation rules are as follows:

- The naming format of the output class method is `{Class}_{Method}`
- The first letter of each word of the class method name is uppercase
- Default output `new()` and `delete()` functions for wrapping `constructor()` and `destructor()` functions
- If this class is not exported, it's methods are always defined as static
- `constructor()` and `destructor()` are always defined as static
- the stdlib.h file is included by default, Because free() and malloc() are used.

## Basic usage

Input:

``` jsx
class Foo {
    constructor() {
        this.text = "hello, world!"
    }

    bar() {
        printf(this.text)
    }
}
```

Output:

``` c
// foo.c
#include <stdlib.h>

typedef struct FooRec_ FooRec;
typedef struct FooRec_* Foo;

struct {
    char *text;
} FooRec_;

static void Foo_Contructor(Foo _this)
{
    _this->text = "hello, world!";
}

static void Foo_Destructor(Foo _this)
{
}

static void Foo_Bar(Foo _this)
{
    printf(_this.text);
}

static Foo Foo_New()
{
    Foo _this = malloc(sizeof(FooRec));

    if (_this == NULL) {
        return NULL;
    }
    Foo_Contructor(_this);
    return _this;
}

static void Foo_Delete(Foo _this)
{
    Foo_Destructor(_this);
    free(_this);
}
```

## Export A Class

Input:

``` jsx
class Foo {
    constructor() {
        this.text = "hello, world!"
    }

    bar() {
        printf(this.text)
    }
}

export Foo
```

Output:

``` c
// foo.h
typedef struct FooRec_* Foo;

void Foo_Bar(Foo _this):

Foo Foo_New();

void Foo_Delete(Foo _this);

```

``` c
// foo.c
#include <stdlib.h>
#include "foo.h"

typedef struct FooRec_ FooRec;

struct {
    char *text;
} FooRec_;

static void Foo_Contructor(Foo _this)
{
    _this->text = "hello, world!";
}

static void Foo_Destructor(Foo _this)
{
}

void Foo_Bar(Foo _this)
{
    printf(_this.text);
}

Foo Foo_New()
{
    Foo _this = malloc(sizeof(FooRec));

    if (_this == NULL) {
        return NULL;
    }
    Foo_Contructor(_this);
    return _this;
}

void Foo_Delete(Foo _this)
{
    Foo_Destructor(_this);
    free(_this);
}
```
