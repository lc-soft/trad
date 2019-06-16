# Trad Language Design Document

> This document is not complete, we are welcome you to improve it.

## Table of Contents

- Base
    1. [ClassDeclaration](#ClassDeclaration)
- LCUI Extensions
    1. [VariableDeclaration](#VariableDeclaration)
    1. [BinaryExpression](#BinaryExpression)
    1. [JSX](#JSX)
    1. [Widget](#Widget)
    1. [WidgetStyle](#WidgetStyle)

## ClassDeclaration

The translation rules are as follows:

- The naming format of the output class method is `{Class}_{Method}`
- The first letter of each word of the class method name is uppercase
- Default output `new()` and `delete()` functions for wrapping `constructor()` and `destructor()` functions
- If this class is not exported, it's methods are always defined as static
- `constructor()` and `destructor()` are always defined as static
- the stdlib.h file is included by default, Because free() and malloc() are used.

**Basic usage:**

``` jsx
// input
class Foo {
    constructor() {
        this.text = "hello, world!"
    }

    bar() {
        printf(this.text)
    }
}
```

``` c
// output .c
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

**Export A Class:**

``` jsx
// input
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

``` c
// output .h
typedef struct FooRec_* Foo;

void Foo_Bar(Foo _this):

Foo Foo_New();

void Foo_Delete(Foo _this);

```

``` c
// output .c
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

## VariableDeclaration

**Basic usage:**

``` jsx
// input
const a = 1
```

``` c
// output
LCUI_ObjectRec a;

Number_Init(&a, 1);
Object_Destroy(&a);
```

## BinaryExpression

**Number operation:**

``` jsx
// input
const a = 1
const b = a * 200
```

``` c
// output
LCUI_ObjectRec a;
LCUI_ObjectRec b;
LCUI_ObjectRec _num_1;
LCUI_Object number_2;

Number_Init(&a, 1);
Number_Init(&b, 0);
Number_Init(&_num_1, 200);
_num_2 = Object_Operate(a, "*", &_num_1);
Object_Destroy(&a);
Object_Destroy(&b);
Object_Destroy(&_1);
Object_Delete(number_2);
```

**String operation:**

``` jsx
// input
const a = 'hello,'
const b = a + ' world!'
```

``` c
// output
LCUI_ObjectRec a;
LCUI_ObjectRec b;
LCUI_ObjectRec _str_1;
LCUI_Object _str_2;

String_Init(&a, "hello");
String_Init(&b, NULL);
String_Init(&_str_1, " world!");
_str_2 = Object_Operate(a, "*", &_str_1);
Object_Destroy(&a);
Object_Destroy(&b);
Object_Destroy(&_str_1);
Object_Delete(_str_2);
```

**Implicit type conversion:**

``` jsx
// input
const a = 1
const b = a + 2 + 'str' + 3
```

```c
// output
LCUI_ObjectRec a;
LCUI_ObjectRec b;
LCUI_ObjectRec _num_1;
LCUI_Object _num_2;
LCUI_ObjectRec _str_1;
LCUI_Object _str_2;
LCUI_Object _str_3;
LCUI_ObjectRec _num_3;
LCUI_Object _str_4;
LCUI_Object _str_5;

// a = 1
Number_Init(&a, 1);
// 2
Number_Init(&_num_1, 2);
// a + 2
_num_2 = Object_Operate(&a, "+", _num_1);
// 'str'
String_Init(_str_1, "str");
// (a + 2).toString()
_str_2 = Object_ToString(_num_2);
// (a + 2).toString() + 'str'
_str_3 = Object_Operate(_str_2, "+", _str_1);
// 3
Number_Init(&_num_3, 3);
// 3.toString()
_str_4 = Object_ToString(&number_3);
// (a + 2).toString() + 'str' + 3.ToString()
_str_5 = Object_Operate(_str_3, "+", _str_4);
// b
String_Init(&b);
// b = (a + 2).toString() + 'str' + 3.ToString()
Object_Operate(&b, "=", _str_5);
Object_Destroy(&a);
Object_Destroy(&b);
Object_Destroy(&_num_1);
Object_Delete(_num_2);
Object_Destroy(&_num_3);
Object_Destroy(&_str_1);
Object_Delete(_str_2);
Object_Delete(_str_3);
Object_Delete(_str_4);
Object_Delete(_str_5);
```

## JSX

## Widget

## WidgetStyle

**Literal assignment:**

``` jsx
// input
// Widget widget
widget.style.width = '100px'
widget.style.display = 'none'
widget.style.zIndex = 100
widget.style.backgroundColor = '#fff'
```

``` c
// output
Widget_SetStyleString(widget, key_width, "100px");
Widget_SetStyleString(widget, key_display, "none");
Widget_SetStyleString(widget, key_z_index, "100");
Widget_SetStyleString(widget, key_background_color, "#fff");
```

**Object assignment:**

``` jsx
// input
const zIndex = 100
widget.style.zIndex = zIndex
```

``` c
// input
LCUI_ObjectRec zIndex;
LCUI_Object _str_zIndex;

Number_Init(&zIndex, 100);
_str_zIndex = Object_ToString(&zIndex);
Widget_SetStyleString(widget, key_z_index, _str_zIndex->value.string);
Object_Destroy(&zIndex);
Object_Delete(_str_zIndex);
```
