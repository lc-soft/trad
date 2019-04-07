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
typedef struct MyAppRefsRec_* MyAppRefs;
typedef struct MyAppRefsRec_ MyAppRefsRec;
typedef void (*MyAppEventHandler)(MyApp, LCUI_WidgetEvent);
typedef struct MyAppEventWrapperRec_* MyAppEventWrapper;
typedef struct MyAppEventWrapperRec_ MyAppEventWrapperRec;
typedef struct MyAppRec_ MyAppRec;

struct MyAppStateRec_
{
        LCUI_ObjectRec text;
        LCUI_ObjectRec input;
        LCUI_ObjectRec value;
        LCUI_ObjectRec total;
}
;

struct MyAppRefsRec_
{
        LCUI_Widget _textedit;
        LCUI_Widget _button;
        LCUI_Widget _progress;
        LCUI_Widget _button_1;
        LCUI_Widget _button_2;
}
;

struct MyAppEventWrapperRec_
{
        MyApp _this;
        void* data;
        MyAppEventHandler handler;
}
;

struct MyAppRec_
{
        MyAppStateRec state;
        MyAppRefsRec refs;
}
;

static void MyApp_Constructor(MyApp);
static void MyApp_OnBtnChangeClick(MyApp, LCUI_WidgetEvent);
static void MyApp_OnBtnMinusClick(MyApp, LCUI_WidgetEvent);
static void MyApp_OnBtnPlusClick(MyApp, LCUI_WidgetEvent);
static void MyApp_Destructor(MyApp);
static void MyApp_OnStateTextChanged(LCUI_Object, void*);
static void MyApp_OnStateInputChanged(LCUI_Object, void*);
static void MyApp_OnStateValueChanged(LCUI_Object, void*);
static void MyApp_OnStateTotalChanged(LCUI_Object, void*);
static void MyApp_DispathWidgetEvent(LCUI_Widget, LCUI_WidgetEvent, void*);

static void MyApp_Constructor(MyApp _this)
{
        /* CallExpression ignored */
        String_Init(&_this->state.text, NULL);
        String_Init(&_this->state.input, NULL);
        Number_Init(&_this->state.value, 0);
        Number_Init(&_this->state.total, 0);
        Object_Watch(&_this->state.text, MyApp_OnStateTextChanged, _this);
        Object_Watch(&_this->state.input, MyApp_OnStateInputChanged, _this);
        Object_Watch(&_this->state.value, MyApp_OnStateValueChanged, _this);
        Object_Watch(&_this->state.total, MyApp_OnStateTotalChanged, _this);
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
        LCUI_Widget textview;
        textview = LCUIWidget_New("textview");
        /* JSXText ignored */
        _this->refs._textedit = LCUIWidget_New("textedit");
        /* JSXText ignored */
        _this->refs._button = LCUIWidget_New("button");
        
        MyAppEventWrapper _event_wrapper;
        _event_wrapper = malloc(sizeof(struct MyAppEventWrapperRec_));
        _event_wrapper->_this = _this;
        _event_wrapper->data = NULL;
        _event_wrapper->handler = MyApp_OnBtnChangeClick;
        Widget_BindEvent(_this->refs._button, "click", MyApp_DispathWidgetEvent, _event_wrapper, free);
        
        /* JSXText ignored */
        /* JSXText ignored */
        LCUI_Widget textview_1;
        textview_1 = LCUIWidget_New("textview");
        /* JSXText ignored */
        /* JSXText ignored */
        _this->refs._progress = LCUIWidget_New("progress");
        /* JSXText ignored */
        _this->refs._button_1 = LCUIWidget_New("button");
        
        MyAppEventWrapper _event_wrapper_1;
        _event_wrapper_1 = malloc(sizeof(struct MyAppEventWrapperRec_));
        _event_wrapper_1->_this = _this;
        _event_wrapper_1->data = NULL;
        _event_wrapper_1->handler = MyApp_OnBtnMinusClick;
        Widget_BindEvent(_this->refs._button_1, "click", MyApp_DispathWidgetEvent, _event_wrapper_1, free);
        
        /* JSXText ignored */
        /* JSXText ignored */
        _this->refs._button_2 = LCUIWidget_New("button");
        
        MyAppEventWrapper _event_wrapper_2;
        _event_wrapper_2 = malloc(sizeof(struct MyAppEventWrapperRec_));
        _event_wrapper_2->_this = _this;
        _event_wrapper_2->data = NULL;
        _event_wrapper_2->handler = MyApp_OnBtnPlusClick;
        Widget_BindEvent(_this->refs._button_2, "click", MyApp_DispathWidgetEvent, _event_wrapper_2, free);
        
        /* JSXText ignored */
        /* JSXText ignored */
        Widget_Append(widget, textview);
        Widget_Append(widget, _this->refs._textedit);
        Widget_Append(widget, _this->refs._button);
        Widget_Append(widget, textview_1);
        Widget_Append(widget, _this->refs._progress);
        Widget_Append(widget, _this->refs._button_1);
        Widget_Append(widget, _this->refs._button_2);
        return widget;
}

static void MyApp_OnBtnChangeClick(MyApp _this, LCUI_WidgetEvent e)
{
        Object_Operate(&_this->state.text, "=", &_this->state.input);
}

static void MyApp_OnBtnMinusClick(MyApp _this, LCUI_WidgetEvent e)
{
        /* IfStatement ignored */
}

static void MyApp_OnBtnPlusClick(MyApp _this, LCUI_WidgetEvent e)
{
        /* IfStatement ignored */
}

static void MyApp_Destructor(MyApp _this)
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

void MyApp_Delete(MyApp _this)
{
        MyApp_Destructor(_this);
        free(_this);
}

static void MyApp_OnStateTextChanged(LCUI_Object text, void* arg)
{
        MyApp _this;
        
        _this = arg;
}

static void MyApp_OnStateInputChanged(LCUI_Object input, void* arg)
{
        MyApp _this;
        
        _this = arg;
        Widget_SetAttributeEx(_this->refs._textedit, "value", input, 0, NULL);
}

static void MyApp_OnStateValueChanged(LCUI_Object value, void* arg)
{
        MyApp _this;
        
        _this = arg;
        Widget_SetAttributeEx(_this->refs._progress, "value", value, 0, NULL);
}

static void MyApp_OnStateTotalChanged(LCUI_Object total, void* arg)
{
        MyApp _this;
        
        _this = arg;
        Widget_SetAttributeEx(_this->refs._progress, "total", total, 0, NULL);
}

static void MyApp_DispathWidgetEvent(LCUI_Widget widget, LCUI_WidgetEvent e, void* arg)
{
        MyApp _this;
        MyAppEventWrapper wrapper;
        
        wrapper = e->data;
        _this = wrapper->_this;
        e->data = wrapper->data;
        wrapper->handler(_this, e);
        e->data = wrapper;
}
