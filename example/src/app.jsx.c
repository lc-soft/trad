#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/textedit.h>
#include "app.jsx.h"
typedef struct MyAppStateRec_ MyAppStateRec;
typedef struct MyAppRefsRec_ MyAppRefsRec;
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
        LCUI_Widget _button_1;
        LCUI_Widget _button_2;
}
;
struct MyAppRec_
{
        MyAppStateRec state;
        MyAppRefsRec refs;
}
;
static void MyApp_Destructor(MyApp, );
static void MyApp_Constructor(LCUI_Widget);
static void MyApp_Destructor(MyApp _this, )
{
        Object_Destroy(&_this->state.text);
        Object_Destroy(&_this->state.input);
        Object_Destroy(&_this->state.value);
        Object_Destroy(&_this->state.total);
}

static void MyApp_Constructor(LCUI_Widget w)
{
        MyApp _this;
        _this = Widget_AddData(w, my_app_class.proto, sizeof(struct MyAppRec_));
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

void MyApp_OnStateTextChanged(LCUI_Object text, void *arg)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        MyApp _this;
        _this = arg;
}

void MyApp_OnStateInputChanged(LCUI_Object input, void *arg)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        MyApp _this;
        _this = arg;
        Widget_SetAttributeEx(_this->refs._textedit, "value", &input, 0, NULL);
}

void MyApp_OnStateValueChanged(LCUI_Object value, void *arg)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        MyApp _this;
        _this = arg;
}

void MyApp_OnStateTotalChanged(LCUI_Object total, void *arg)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        MyApp _this;
        _this = arg;
}

void MyApp_Created(LCUI_Widget w)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        String_SetValue(&_this->state.text, "Hello, World!");
        String_SetValue(&_this->state.input, "Hello, World!");
        Number_SetValue(&_this->state.value, 50);
        Number_SetValue(&_this->state.total, 100);
}

LCUI_Widget MyApp_Template(LCUI_Widget w)
{
        MyApp _this;
        LCUI_Widget widget;
        LCUI_Widget textview;
        LCUI_Widget textview_1;
        _this = Widget_GetData(w,  my_app_class.proto);
        widget = LCUIWidget_New(NULL);
        /* JSXText ignored */
        textview = LCUIWidget_New("textview");
        /* JSXText ignored */
        _this->refs._textedit = LCUIWidget_New("textedit");
        /* JSXText ignored */
        _this->refs._button = LCUIWidget_New("button");
        /* JSXElementAttribute ignored */
        /* JSXText ignored */
        /* JSXText ignored */
        textview_1 = LCUIWidget_New("textview");
        /* JSXText ignored */
        /* JSXText ignored */
        _this->refs._button_1 = LCUIWidget_New("button");
        /* JSXElementAttribute ignored */
        /* JSXText ignored */
        /* JSXText ignored */
        _this->refs._button_2 = LCUIWidget_New("button");
        /* JSXElementAttribute ignored */
        /* JSXText ignored */
        /* JSXText ignored */
        Widget_Append(widget, textview);
        Widget_Append(widget, _this->refs._textedit);
        Widget_Append(widget, _this->refs._button);
        Widget_Append(widget, textview_1);
        Widget_Append(widget, _this->refs._button_1);
        Widget_Append(widget, _this->refs._button_2);
        return widget;
}

void MyApp_OnBtnChangeClick(LCUI_Widget w)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        Object_Operate(&_this->state.text, "=", &_this->state.input);
}

void MyApp_OnBtnMinusClick(LCUI_Widget w)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        /* IfStatement ignored */
}

void MyApp_OnBtnPlusClick(LCUI_Widget w)
{
        MyApp _this;
        _this = Widget_GetData(w,  my_app_class.proto);
        /* IfStatement ignored */
}
