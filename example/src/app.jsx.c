#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <stdlib.h>
#include "./components/progress.h"
#include "app.jsx.h"

typedef struct MyAppStateRec_* MyAppState;
typedef struct MyAppStateRec_ MyAppStateRec;

struct MyAppStateRec_
{
        LCUI_ObjectRec text;
        LCUI_ObjectRec input;
        LCUI_ObjectRec value;
        LCUI_ObjectRec total;
}
;

typedef struct MyAppRefsRec_* MyAppRefs;
typedef struct MyAppRefsRec_ MyAppRefsRec;

struct MyAppRefsRec_
{
        LCUI_Widget test;
        LCUI_Widget _textedit;
        LCUI_Widget _progress;
}
;


typedef struct MyAppRec_ MyAppRec;

struct MyAppRec_
{
        MyAppStateRec state;
        MyAppRefsRec refs;
}
;



static void MyApp_Constructor(MyApp _this)
{
        /* CallExpression ignored */
        Object_Init(&_this->state.text);
        Object_Init(&_this->state.input);
        Object_Init(&_this->state.value);
        Object_Init(&_this->state.total);
        Object_Watch(&_this->state.text, MyApp_OnStateTextChanged, _this);
        Object_Watch(&_this->state.input, MyApp_OnStateInputChanged, _this);
        Object_Watch(&_this->state.value, MyApp_OnStateValueChanged, _this);
        Object_Watch(&_this->state.total, MyApp_OnStateTotalChanged, _this);
}

MyApp MyApp_OnStateTextChanged(void* arg)
{
        MyApp _this;
        LCUI_Object text;
        
        _this = arg;
        text = &_this->state.text;
}

MyApp MyApp_OnStateInputChanged(void* arg)
{
        MyApp _this;
        LCUI_Object input;
        
        _this = arg;
        input = &_this->state.input;
        Widget_SetAttributeEx(_this->refs._textedit, "value", &_this->state.input, NULL);
}

MyApp MyApp_OnStateValueChanged(void* arg)
{
        MyApp _this;
        LCUI_Object value;
        
        _this = arg;
        value = &_this->state.value;
        Widget_SetAttributeEx(_this->refs._progress, "value", &_this->state.value, NULL);
}

MyApp MyApp_OnStateTotalChanged(void* arg)
{
        MyApp _this;
        LCUI_Object total;
        
        _this = arg;
        total = &_this->state.total;
        Widget_SetAttributeEx(_this->refs._progress, "total", &_this->state.total, NULL);
}

void MyApp_Created(MyApp _this)
{
        String_SetValue(&_this->state.text, "Hello, World!");
        String_SetValue(&_this->state.input, "Hello, World!");
        Number_SetValue(&_this->state.value, 50);
        Number_SetValue(&_this->state.total, 100);
}

LCUI_Widget MyApp_Template(MyApp _this)
{
        LCUI_Widget widget;
        widget = LCUIWidget_New(NULL);
        /* JSXText ignored */
        refs.test = LCUIWidget_New("textview");
        Widget_Append(refs.test, _this->state.text);
        /* JSXText ignored */
        Widget_SetAttribute(NULL, "test", "asd");
        _this->refs._textedit = LCUIWidget_New("textedit");
        /* JSXText ignored */
        LCUI_Widget button;
        button = LCUIWidget_New("button");
        /* JSXText ignored */
        /* JSXText ignored */
        LCUI_Widget textview;
        textview = LCUIWidget_New("textview");
        /* JSXText ignored */
        /* JSXText ignored */
        _this->refs._progress = LCUIWidget_New("progress");
        /* JSXText ignored */
        LCUI_Widget button_1;
        button_1 = LCUIWidget_New("button");
        /* JSXText ignored */
        /* JSXText ignored */
        LCUI_Widget button_2;
        button_2 = LCUIWidget_New("button");
        /* JSXText ignored */
        /* JSXText ignored */
        Widget_Append(widget, refs.test);
        Widget_Append(widget, _this->refs._textedit);
        Widget_Append(widget, button);
        Widget_Append(widget, textview);
        Widget_Append(widget, _this->refs._progress);
        Widget_Append(widget, button_1);
        Widget_Append(widget, button_2);
        return widget;
}

void MyApp_OnBtnChangeClick(MyApp _this)
{
        Object_Operate(&_this->state.text, "=", &_this->state.input);
}

void MyApp_OnBtnMinusClick(MyApp _this)
{
        /* IfStatement ignored */
}

void MyApp_OnBtnPlusClick(MyApp _this)
{
        /* IfStatement ignored */
}

static MyApp MyApp_Destructor(MyApp _this)
{
        Object_Destroy(&_this->state.text);
        Object_Destroy(&_this->state.input);
        Object_Destroy(&_this->state.value);
        Object_Destroy(&_this->state.total);
}

MyApp MyApp_New()
{
        MyApp _this;
        
        _this = malloc(sizeof(struct MyAppRec_));
        if (_this == NULL)
        {
                return NULL;
        }
        MyApp_Constructor(_this);
        return _this;
}

MyApp MyApp_Delete(MyApp _this)
{
        MyApp_Destructor(_this);
        free(_this);
}
