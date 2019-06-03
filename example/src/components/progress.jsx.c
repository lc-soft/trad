#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/textedit.h>
#include <string.h>
#include <LCUI/gui/css_parser.h>
#include <stdlib.h>
#include "progress.jsx.h"

typedef struct ProgressRec_ ProgressRec;
typedef struct ProgressPropsRec_ ProgressPropsRec;
typedef struct ProgressDefaultPropsRec_ ProgressDefaultPropsRec;
typedef struct ProgressRefsRec_ ProgressRefsRec;
typedef struct ProgressClassRec_ ProgressClassRec;
typedef struct ProgressClassRec_* ProgressClass;

struct ProgressPropsRec_ {
        LCUI_Object total;
        LCUI_Object value;
};

struct ProgressDefaultPropsRec_ {
        LCUI_ObjectRec total;
        LCUI_ObjectRec value;
};

struct ProgressRefsRec_ {
        LCUI_Widget bar;
};

struct ProgressRec_ {
        ProgressPropsRec props;
        ProgressDefaultPropsRec default_props;
        unsigned props_changes;
        ProgressRefsRec refs;
};

struct ProgressClassRec_ {
        LCUI_WidgetPrototype proto;
};


static void Progress_Destructor(LCUI_Widget);
static void Progress_Constructor(LCUI_Widget);
static void Progress_OnPropTotalChanged(LCUI_Object, void*);
static void Progress_OnPropValueChanged(LCUI_Object, void*);
static LCUI_Widget Progress_Template(LCUI_Widget);

const char *progress_css = ".progress {"
"  height: 16px;"
"  background-color: #e9ecef;"
"}"
".progress-bar {"
"  background-color: #007bff;"
"}";
ProgressClassRec progress_class;

static void Progress_Destructor(LCUI_Widget w)
{
        Progress _this;

        _this = Widget_GetData(w, progress_class.proto);
        _this->props.total = NULL;
        _this->props.value = NULL;
}

static void Progress_Constructor(LCUI_Widget w)
{
        Progress _this;

        _this = Widget_AddData(w, progress_class.proto, sizeof(struct ProgressRec_));
        progress_class.proto->proto->init(w);
        _this->props_changes = 1;
        Number_Init(&_this->default_props.total, 0);
        Number_Init(&_this->default_props.value, 0);
        _this->props.total = &_this->default_props.total;
        _this->props.value = &_this->default_props.value;
        Progress_Template(w);
        Progress_Update(w);
}

void Progress_BindProperty(LCUI_Widget w, const char *name, LCUI_Object value)
{
        Progress _this;

        _this = Widget_GetData(w, progress_class.proto);
        if (strcmp(name, "total") == 0)
        {
                _this->props.total = value;
                Object_Watch(value, Progress_OnPropTotalChanged, w);
                Progress_OnPropTotalChanged(value, w);
        }
        else if (strcmp(name, "value") == 0)
        {
                _this->props.value = value;
                Object_Watch(value, Progress_OnPropValueChanged, w);
                Progress_OnPropValueChanged(value, w);
        }
}

static void Progress_OnPropTotalChanged(LCUI_Object total, void *arg)
{
        Progress _this;
        LCUI_Widget w;

        w = arg;
        _this = Widget_GetData(w, progress_class.proto);
        ++_this->props_changes;
        Widget_AddTask(w, LCUI_WTASK_USER);
}

static void Progress_OnPropValueChanged(LCUI_Object value, void *arg)
{
        Progress _this;
        LCUI_Widget w;

        w = arg;
        _this = Widget_GetData(w, progress_class.proto);
        ++_this->props_changes;
        Widget_AddTask(w, LCUI_WTASK_USER);
}

static LCUI_Widget Progress_Template(LCUI_Widget w)
{
        Progress _this;

        _this = Widget_GetData(w, progress_class.proto);
        Widget_AddClass(w, "progress");
        _this->refs.bar = LCUIWidget_New(NULL);
        Widget_AddClass(_this->refs.bar, "progress-bar");
        Widget_Append(w, _this->refs.bar);
        return w;
}

void Progress_Update(LCUI_Widget w)
{
        Progress _this;
        LCUI_ObjectRec _num;
        LCUI_Object _num_1;
        LCUI_Object _num_2;
        LCUI_Object percentage;
        LCUI_ObjectRec _str;
        LCUI_Object percentage_str;
        LCUI_Object _str_1;

        _this = Widget_GetData(w, progress_class.proto);
        if (_this->props_changes < 1)
        {
                return;
        }
        _this->props_changes = 0;
        Number_Init(&_num, 100);
        _num_1 = Object_Operate(_this->props.value, "*", &_num);
        _num_2 = Object_Operate(_num_1, "/", _this->props.total);
        percentage = Object_Duplicate(_num_2);
        String_Init(&_str, "%");
        percentage_str = Object_ToString(percentage);
        _str_1 = Object_Operate(percentage_str, "+", &_str);
        Widget_SetStyleString(_this->refs.bar, "width", _str_1->value.string);

        Object_Destroy(&_num);
        Object_Delete(_num_1);
        Object_Delete(_num_2);
        Object_Delete(percentage);
        Object_Destroy(&_str);
        Object_Delete(percentage_str);
        Object_Delete(_str_1);
}

LCUI_Widget Progress_New()
{
        return LCUIWidget_New("progress");
}

void Progress_Delete(LCUI_Widget w)
{
        Widget_Destroy(w);
}

void Progress_Install()
{
        progress_class.proto = LCUIWidget_NewPrototype("progress", NULL);
        progress_class.proto->init = Progress_Constructor;
        progress_class.proto->destroy = Progress_Destructor;
        progress_class.proto->runtask = Progress_Update;
        LCUI_LoadCSSString(progress_css, __FILE__);
}
