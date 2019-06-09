#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/textedit.h>
#include <LCUI/gui/css_parser.h>
#include <LCUI/timer.h>
#include <stdlib.h>
#include "components\progress.jsx.h"
#include "app.jsx.h"

typedef struct MyAppRec_ MyAppRec;
typedef struct MyAppRec_* MyApp;
typedef struct MyAppStateRec_ MyAppStateRec;
typedef struct MyAppRefsRec_ MyAppRefsRec;
typedef struct MyAppComputedPropsRec_ MyAppComputedPropsRec;
typedef void (*MyAppEventHandler)(MyApp, LCUI_WidgetEvent);
typedef struct MyAppEventWrapperRec_ MyAppEventWrapperRec;
typedef struct MyAppEventWrapperRec_* MyAppEventWrapper;

struct MyAppStateRec_ {
        LCUI_ObjectRec text;
        LCUI_ObjectRec input;
        LCUI_ObjectRec value;
        LCUI_ObjectRec total;
};

struct MyAppRefsRec_ {
        LCUI_Widget _textview;
        LCUI_Widget input;
        LCUI_Widget _button;
        LCUI_Widget _textview_1;
        LCUI_Widget _progress;
        LCUI_Widget _button_1;
        LCUI_Widget _button_2;
};

struct MyAppComputedPropsRec_ {
        LCUI_ObjectRec _expr_6;
};

struct MyAppRec_ {
        MyAppStateRec state;
        unsigned state_changes;
        LCUI_Widget view;
        MyAppRefsRec refs;
        MyAppComputedPropsRec computed_props;
};

struct MyAppEventWrapperRec_ {
        MyApp _this;
        void *data;
        MyAppEventHandler handler;
};


static void MyApp_Destructor(MyApp);
static void MyApp_Constructor(MyApp);
static void MyApp_InitState(MyApp);
static void MyApp_DestroyState(MyApp);
static void MyApp_OnStateTextChanged(LCUI_Object, void*);
static void MyApp_OnStateInputChanged(LCUI_Object, void*);
static void MyApp_OnStateValueChanged(LCUI_Object, void*);
static void MyApp_OnStateTotalChanged(LCUI_Object, void*);
static void MyApp_OnBtnChangeClick(MyApp, LCUI_WidgetEvent);
static void MyApp_OnBtnMinusClick(MyApp, LCUI_WidgetEvent);
static void MyApp_OnBtnPlusClick(MyApp, LCUI_WidgetEvent);
static LCUI_Widget MyApp_Template(MyApp);
static void MyApp_UpdateTextview2Text(MyApp);
static void MyApp_DispathWidgetEvent(LCUI_Widget, LCUI_WidgetEvent, void*);
static LCUI_Object MyApp_ComputeExpression6(MyApp);
static void MyApp_ComputeProperty6(MyApp);
static void MyApp_UpdateTextview6Text(MyApp);
static void MyApp_InitComputedProps(MyApp);
static void MyApp_DestroyComputedProps(MyApp);
static void MyApp_AutoUpdate(MyApp);
static void MyApp_Update(MyApp);
static int MyApp_Run(MyApp);
static MyApp MyApp_New();
static void MyApp_Delete(MyApp);

const char *app_css = "root {"
"    background-color: #f6f8fa;"
"}"
".example {"
"    max-width: 480px;"
"    padding: 25px;"
"    margin: 25px auto;"
"    background-color: #fff;"
"    border: 1px solid #eee;"
"}"
".form-control {"
"    padding: 5px;"
"    margin: -5px -5px 10px -5px;"
"}"
".item {"
"    margin-bottom: 15px;"
"}"
".button-group {"
"    display: flex;"
"    justify-content: center;"
"}"
".button-group button {"
"    margin: 0 4px;"
"}";

static void MyApp_Destructor(MyApp _this)
{
        MyApp_DestroyState(_this);
        MyApp_DestroyComputedProps(_this);
}

static void MyApp_Constructor(MyApp _this)
{
        LCUI_Init();
        Progress_Install();
        MyApp_InitState(_this);
        MyApp_InitComputedProps(_this);
        LCUI_LoadCSSString(app_css, __FILE__);
        MyApp_Template(_this);
        MyApp_Update(_this);
}

static void MyApp_InitState(MyApp _this)
{
        _this->state_changes = 1;
        String_Init(&_this->state.text, "World");
        String_Init(&_this->state.input, "World");
        Number_Init(&_this->state.value, 50);
        Number_Init(&_this->state.total, 100);
        Object_Watch(&_this->state.text, MyApp_OnStateTextChanged, _this);
        Object_Watch(&_this->state.input, MyApp_OnStateInputChanged, _this);
        Object_Watch(&_this->state.value, MyApp_OnStateValueChanged, _this);
        Object_Watch(&_this->state.total, MyApp_OnStateTotalChanged, _this);
}

static void MyApp_DestroyState(MyApp _this)
{
        Object_Destroy(&_this->state.text);
        Object_Destroy(&_this->state.input);
        Object_Destroy(&_this->state.value);
        Object_Destroy(&_this->state.total);
}

static void MyApp_OnStateTextChanged(LCUI_Object text, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
}

static void MyApp_OnStateInputChanged(LCUI_Object input, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
}

static void MyApp_OnStateValueChanged(LCUI_Object value, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
}

static void MyApp_OnStateTotalChanged(LCUI_Object total, void *arg)
{
        MyApp _this;

        _this = arg;
        ++_this->state_changes;
}

static void MyApp_OnBtnChangeClick(MyApp _this, LCUI_WidgetEvent e)
{
}

static void MyApp_OnBtnMinusClick(MyApp _this, LCUI_WidgetEvent e)
{
        LCUI_ObjectRec _num;

        Number_Init(&_num, 0);
        if (Object_Compare(&_this->state.value, &_num) > 0)
        {
                LCUI_ObjectRec _num;

                Number_Init(&_num, 10);
                Object_Operate(&_this->state.value, "-=", &_num);

                Object_Destroy(&_num);
        }

        Object_Destroy(&_num);
}

static void MyApp_OnBtnPlusClick(MyApp _this, LCUI_WidgetEvent e)
{
        LCUI_ObjectRec _num;

        Number_Init(&_num, 100);
        if (Object_Compare(&_this->state.value, &_num) < 0)
        {
                LCUI_ObjectRec _num;

                Number_Init(&_num, 10);
                Object_Operate(&_this->state.value, "+=", &_num);

                Object_Destroy(&_num);
        }

        Object_Destroy(&_num);
}

static LCUI_Widget MyApp_Template(MyApp _this)
{
        LCUI_Widget widget;
        MyAppEventWrapper _ev;
        LCUI_Widget widget_1;
        MyAppEventWrapper _ev_1;
        MyAppEventWrapper _ev_2;

        _this->view = LCUIWidget_New(NULL);
        Widget_AddClass(_this->view, "example");
        _this->refs._textview = LCUIWidget_New("textview");
        Widget_AddClass(_this->refs._textview, "item");
        widget = LCUIWidget_New(NULL);
        Widget_AddClass(widget, "form-control");
        _this->refs.input = LCUIWidget_New("textedit");
        Widget_BindProperty(_this->refs.input, "value", &_this->state.input);
        _this->refs._button = LCUIWidget_New("button");
        _ev = malloc(sizeof(MyAppEventWrapperRec));
        _ev->_this = _this;
        _ev->data = NULL;
        _ev->handler = MyApp_OnBtnChangeClick;
        Widget_BindEvent(_this->refs._button, "click", MyApp_DispathWidgetEvent, _ev, free);
        Widget_SetText(_this->refs._button, "Change");
        Widget_Append(widget, _this->refs.input);
        Widget_Append(widget, _this->refs._button);
        _this->refs._textview_1 = LCUIWidget_New("textview");
        Widget_AddClass(_this->refs._textview_1, "item");
        _this->refs._progress = LCUIWidget_New("progress");
        Widget_AddClass(_this->refs._progress, "item");
        Widget_BindProperty(_this->refs._progress, "value", &_this->state.value);
        Widget_BindProperty(_this->refs._progress, "total", &_this->state.total);
        widget_1 = LCUIWidget_New(NULL);
        Widget_AddClass(widget_1, "button-group");
        _this->refs._button_1 = LCUIWidget_New("button");
        _ev_1 = malloc(sizeof(MyAppEventWrapperRec));
        _ev_1->_this = _this;
        _ev_1->data = NULL;
        _ev_1->handler = MyApp_OnBtnMinusClick;
        Widget_BindEvent(_this->refs._button_1, "click", MyApp_DispathWidgetEvent, _ev_1, free);
        Widget_SetText(_this->refs._button_1, "-");
        _this->refs._button_2 = LCUIWidget_New("button");
        _ev_2 = malloc(sizeof(MyAppEventWrapperRec));
        _ev_2->_this = _this;
        _ev_2->data = NULL;
        _ev_2->handler = MyApp_OnBtnPlusClick;
        Widget_BindEvent(_this->refs._button_2, "click", MyApp_DispathWidgetEvent, _ev_2, free);
        Widget_SetText(_this->refs._button_2, "+");
        Widget_Append(widget_1, _this->refs._button_1);
        Widget_Append(widget_1, _this->refs._button_2);
        Widget_Append(_this->view, _this->refs._textview);
        Widget_Append(_this->view, widget);
        Widget_Append(_this->view, _this->refs._textview_1);
        Widget_Append(_this->view, _this->refs._progress);
        Widget_Append(_this->view, widget_1);
        Widget_Append(LCUIWidget_GetRoot(), _this->view);

        return _this->view;
}

static void MyApp_UpdateTextview2Text(MyApp _this)
{
        LCUI_ObjectRec _str;
        LCUI_Object _str_1;
        LCUI_ObjectRec _str_2;
        LCUI_Object _str_3;

        String_Init(&_str, "Hello, ");
        _str_1 = Object_Operate(&_str, "+", &_this->state.text);
        String_Init(&_str_2, "!");
        _str_3 = Object_Operate(_str_1, "+", &_str_2);
        Widget_SetText(_this->refs._textview, _str_3->value.string);

        Object_Destroy(&_str);
        Object_Delete(_str_1);
        Object_Destroy(&_str_2);
        Object_Delete(_str_3);
}

static void MyApp_DispathWidgetEvent(LCUI_Widget widget, LCUI_WidgetEvent e, void *arg)
{
        MyApp _this;
        MyAppEventWrapper wrapper;

        wrapper = e->data;
        _this = wrapper->_this;
        e->data = wrapper->data;
        wrapper->handler(_this, e);
        e->data = wrapper;
}

static LCUI_Object MyApp_ComputeExpression6(MyApp _this)
{
        LCUI_Object _num;
        LCUI_ObjectRec _num_1;
        LCUI_Object _num_2;
        LCUI_ObjectRec _str;
        LCUI_Object _num_2_str;
        LCUI_Object _str_1;

        _num = Object_Operate(&_this->state.value, "/", &_this->state.total);
        Number_Init(&_num_1, 100);
        _num_2 = Object_Operate(_num, "*", &_num_1);
        String_Init(&_str, "%");
        _num_2_str = Object_ToString(_num_2);
        _str_1 = Object_Operate(_num_2_str, "+", &_str);

        Object_Delete(_num);
        Object_Destroy(&_num_1);
        Object_Delete(_num_2);
        Object_Destroy(&_str);
        Object_Delete(_num_2_str);

        return _str_1;
}

static void MyApp_ComputeProperty6(MyApp _this)
{
        LCUI_Object tmp;

        tmp = MyApp_ComputeExpression6(_this);
        Object_Operate(&_this->computed_props._expr_6, "=", tmp);

        Object_Delete(tmp);
}

static void MyApp_UpdateTextview6Text(MyApp _this)
{
        LCUI_ObjectRec _str;
        LCUI_Object _str_1;
        LCUI_ObjectRec _str_2;
        LCUI_Object _str_3;

        String_Init(&_str, " Please click button to test progress (");
        _str_1 = Object_Operate(&_str, "+", &_this->computed_props._expr_6);
        String_Init(&_str_2, ") ");
        _str_3 = Object_Operate(_str_1, "+", &_str_2);
        Widget_SetText(_this->refs._textview_1, _str_3->value.string);

        Object_Destroy(&_str);
        Object_Delete(_str_1);
        Object_Destroy(&_str_2);
        Object_Delete(_str_3);
}

static void MyApp_InitComputedProps(MyApp _this)
{
        String_Init(&_this->computed_props._expr_6, NULL);
}

static void MyApp_DestroyComputedProps(MyApp _this)
{
        Object_Destroy(&_this->computed_props._expr_6);
}

static void MyApp_AutoUpdate(MyApp _this)
{
        MyApp_Update(_this);
        LCUI_SetTimeout(0, (TimerCallback)MyApp_AutoUpdate, _this);
}

static void MyApp_Update(MyApp _this)
{
        if (_this->state_changes < 1)
        {
                return;
        }
        _this->state_changes = 0;
        MyApp_ComputeProperty6(_this);
        MyApp_UpdateTextview2Text(_this);
        MyApp_UpdateTextview6Text(_this);
}

static int MyApp_Run(MyApp _this)
{
        MyApp_AutoUpdate(_this);

        return LCUI_Main();
}

static MyApp MyApp_New()
{
        MyApp _this;
        _this = malloc(sizeof(MyAppRec));
        if (_this == NULL)
        {
                return NULL;
        }
        MyApp_Constructor(_this);

        return _this;
}

static void MyApp_Delete(MyApp _this)
{
        MyApp_Destructor(_this);
        free(_this);
}


int main()
{
        MyApp app;
        int ret;

        app = MyApp_New();
        ret = MyApp_Run(app);

        MyApp_Delete(app);

        return ret;
}
