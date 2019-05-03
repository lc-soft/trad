#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/textedit.h>
#include "progress.jsx.h"
typedef struct ProgressClassRec_ ProgressClassRec;
typedef struct ProgressClassRec_* ProgressClass;
typedef struct ProgressPropsRec_ ProgressPropsRec;
typedef struct ProgressDefaultPropsRec_ ProgressDefaultPropsRec;
typedef struct ProgressRefsRec_ ProgressRefsRec;
typedef struct ProgressRec_ ProgressRec;
struct ProgressClassRec_
{
        LCUI_WidgetPrototype proto;
}
;
struct ProgressPropsRec_
{
        LCUI_Object total;
        LCUI_Object value;
}
;
struct ProgressDefaultPropsRec_
{
        LCUI_ObjectRec total;
        LCUI_ObjectRec value;
}
;
struct ProgressRefsRec_
{
        LCUI_Widget bar;
}
;
struct ProgressRec_
{
        ProgressPropsRec props;
        ProgressDefaultPropsRec default_props;
        ProgressRefsRec refs;
}
;
static void Progress_Destructor(LCUI_Widget);
static void Progress_Constructor(LCUI_Widget);
ProgressClassRec progress_class;
static void Progress_Destructor(LCUI_Widget w)
{
        Progress _this;
        _this = Widget_GetData(w,  progress_class.proto);
        _this->props.total = NULL;
        _this->props.value = NULL;
}

static void Progress_Constructor(LCUI_Widget w)
{
        Progress _this;
        _this = Widget_AddData(w, progress_class.proto, sizeof(struct ProgressRec_));
        /* CallExpression ignored */
        Number_Init(&_this->default_props.total, 0);
        Number_Init(&_this->default_props.value, 0);
        _this->props.total = &_this->default_props.total;
        _this->props.value = &_this->default_props.value;
}

void Progress_BindProperty(LCUI_Widget w, const char *name, LCUI_Object value)
{
        Progress _this;
        _this = Widget_GetData(w,  progress_class.proto);
        if (strcmp(name, "total") == 0)
        {
                _this->props.total = value;
                Object_Watch(value, Progress_OnPropTotalChanged, _this);
                Progress_OnPropTotalChanged(value, _this);
        }
        else if (strcmp(name, "value") == 0)
        {
                _this->props.value = value;
                Object_Watch(value, Progress_OnPropValueChanged, _this);
                Progress_OnPropValueChanged(value, _this);
        }
}

void Progress_OnPropTotalChanged(LCUI_Object total, void *arg)
{
        Progress _this;
        _this = arg;
}

void Progress_OnPropValueChanged(LCUI_Object value, void *arg)
{
        Progress _this;
        _this = arg;
}

LCUI_Widget Progress_Template(LCUI_Widget w)
{
        Progress _this;
        LCUI_Widget widget;
        _this = Widget_GetData(w,  progress_class.proto);
        widget = LCUIWidget_New(NULL);
        Widget_SetAttribute(widget, "class", "progress");
        /* JSXText ignored */
        _this->refs.bar = LCUIWidget_New(NULL);
        Widget_SetAttribute(_this->refs.bar, "class", "bar");
        /* JSXText ignored */
        Widget_Append(widget, _this->refs.bar);
        return widget;
}

void Progress_Update(LCUI_Widget w)
{
        Progress _this;
        LCUI_ObjectRec _number;
        LCUI_Object _number_1;
        LCUI_Object _number_2;
        LCUI_Object percentage;
        LCUI_ObjectRec _string;
        LCUI_Object percentage_str;
        LCUI_Object _string_1;
        _this = Widget_GetData(w,  progress_class.proto);
        Number_Init(&_number, 100);
        _number_1 = Object_Operate(_this->props.value, "*", &_number);
        _number_2 = Object_Operate(_number_1, "/", _this->props.total);
        percentage = Object_Duplicate(_number_2);
        String_Init(&_string, "%");
        percentage_str = Object_ToString(percentage);
        _string_1 = Object_Operate(percentage_str, "+", &_string);
        Widget_SetStyleString(_this->refs.bar, key_width, _string_1);
        Object_Destroy(&_number);
        Object_Delete(_number_1);
        Object_Delete(_number_2);
        Object_Delete(percentage);
        Object_Destroy(&_string);
        Object_Delete(percentage_str);
        Object_Delete(_string_1);
}

void LCUIWidget_AddProgress()
{
        progress_class.proto = LCUIWidget_NewPrototype("progress", NULL);
        progress_class.proto->init = Progress_Constructor;
        progress_class.proto->destroy = Progress_Destructor;
}
