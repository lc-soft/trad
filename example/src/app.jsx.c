#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/textedit.h>
#include <LCUI/timer.h>
#include <stdlib.h>
#include "components\progress.jsx.h"
#include "app.jsx.h"

typedef struct MyAppRec_ MyAppRec;
typedef struct MyAppRec_* MyApp;
typedef struct MyAppStateRec_ MyAppStateRec;
typedef struct MyAppRefsRec_ MyAppRefsRec;
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
        LCUI_Widget _textedit;
        LCUI_Widget _button;
        LCUI_Widget _progress;
        LCUI_Widget _button_1;
        LCUI_Widget _button_2;
};

struct MyAppRec_ {
        MyAppStateRec state;
        unsigned state_changes;
        LCUI_Widget view;
        MyAppRefsRec refs;
};

struct MyAppEventWrapperRec_ {
        MyApp _this;
        void *data;
        MyAppEventHandler handler;
};


static void MyApp_Destructor(MyApp);
static void MyApp_Constructor(MyApp);
static void MyApp_OnStateTextChanged(LCUI_Object, void*);
static void MyApp_OnStateInputChanged(LCUI_Object, void*);
static void MyApp_OnStateValueChanged(LCUI_Object, void*);
static void MyApp_OnStateTotalChanged(LCUI_Object, void*);
static void MyApp_Created(MyApp);
static void MyApp_OnBtnChangeClick(MyApp, LCUI_WidgetEvent);
static void MyApp_OnBtnMinusClick(MyApp, LCUI_WidgetEvent);
static void MyApp_OnBtnPlusClick(MyApp, LCUI_WidgetEvent);
static LCUI_Widget MyApp_Template(MyApp);
static void MyApp_DispathWidgetEvent(LCUI_Widget, LCUI_WidgetEvent, void*);
static void MyApp_AutoUpdate(MyApp);
static void MyApp_Update(MyApp);
static int MyApp_Run(MyApp);
static MyApp MyApp_New();
static void MyApp_Delete(MyApp);

static void MyApp_Destructor(MyApp _this)
{
        Object_Destroy(&_this->state.text);
        Object_Destroy(&_this->state.input);
        Object_Destroy(&_this->state.value);
        Object_Destroy(&_this->state.total);
}

static void MyApp_Constructor(MyApp _this)
{
        LCUI_Init();
        Progress_Install();
        _this->state_changes = 1;
        String_Init(&_this->state.text, NULL);
        String_Init(&_this->state.input, NULL);
        Number_Init(&_this->state.value, 0);
        Number_Init(&_this->state.total, 0);
        Object_Watch(&_this->state.text, MyApp_OnStateTextChanged, _this);
        Object_Watch(&_this->state.input, MyApp_OnStateInputChanged, _this);
        Object_Watch(&_this->state.value, MyApp_OnStateValueChanged, _this);
        Object_Watch(&_this->state.total, MyApp_OnStateTotalChanged, _this);
        MyApp_Template(_this);
        MyApp_Update(_this);
        MyApp_Created(_this);
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

static void MyApp_Created(MyApp _this)
{
        String_SetValue(&_this->state.text, "Hello, World!");
        String_SetValue(&_this->state.input, "Hello, World!");
        Number_SetValue(&_this->state.value, 50);
        Number_SetValue(&_this->state.total, 100);
}

static void MyApp_OnBtnChangeClick(MyApp _this, LCUI_WidgetEvent e)
{
        Object_Operate(&_this->state.text, "=", &_this->state.input);
}

static void MyApp_OnBtnMinusClick(MyApp _this, LCUI_WidgetEvent e)
{
        LCUI_ObjectRec _num;

        Number_Init(&_num, 0);
        if (Object_Compare(&_this->state.value, &_num) > 0)
        {
                Number_SetValue(&_this->state.value, 10);
        }

        Object_Destroy(&_num);
}

static void MyApp_OnBtnPlusClick(MyApp _this, LCUI_WidgetEvent e)
{
        LCUI_ObjectRec _num;

        Number_Init(&_num, 100);
        if (Object_Compare(&_this->state.value, &_num) < 0)
        {
                Number_SetValue(&_this->state.value, 10);
        }

        Object_Destroy(&_num);
}

static LCUI_Widget MyApp_Template(MyApp _this)
{
        LCUI_Widget textview;
        MyAppEventWrapper _ev;
        LCUI_Widget textview_1;
        MyAppEventWrapper _ev_1;
        MyAppEventWrapper _ev_2;

        _this->view = LCUIWidget_New(NULL);
        textview = LCUIWidget_New("textview");
        _this->refs._textedit = LCUIWidget_New("textedit");
        Widget_BindProperty(_this->refs._textedit, "value", &_this->state.input);
        _this->refs._button = LCUIWidget_New("button");
        _ev = malloc(sizeof(MyAppEventWrapperRec));
        _ev->_this = _this;
        _ev->data = NULL;
        _ev->handler = MyApp_OnBtnChangeClick;
        Widget_BindEvent(_this->refs._button, "click", MyApp_DispathWidgetEvent, _ev, free);
        Widget_SetText(_this->refs._button, "Change");
        textview_1 = LCUIWidget_New("textview");
        Widget_SetText(textview_1, "Please click button to test progress");
        _this->refs._progress = LCUIWidget_New("progress");
        Widget_BindProperty(_this->refs._progress, "value", &_this->state.value);
        Widget_BindProperty(_this->refs._progress, "total", &_this->state.total);
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
        Widget_Append(_this->view, textview);
        Widget_Append(_this->view, _this->refs._textedit);
        Widget_Append(_this->view, _this->refs._button);
        Widget_Append(_this->view, textview_1);
        Widget_Append(_this->view, _this->refs._progress);
        Widget_Append(_this->view, _this->refs._button_1);
        Widget_Append(_this->view, _this->refs._button_2);
        Widget_Append(LCUIWidget_GetRoot(), _this->view);
        return _this->view;
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

        app = MyApp_New();
        return MyApp_Run(app);

        MyApp_Delete(app);
}
