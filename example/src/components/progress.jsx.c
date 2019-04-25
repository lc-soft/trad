#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>
#include <LCUI/gui/widget/button.h>
#include <LCUI/gui/widget/textview.h>
#include <LCUI/gui/widget/textedit.h>
#include <stdlib.h>
#include "progress.jsx.h"
typedef struct ProgressPropsRec_ ProgressPropsRec;
typedef struct ProgressDefaultPropsRec_ ProgressDefaultPropsRec;
typedef struct ProgressRefsRec_ ProgressRefsRec;
typedef struct ProgressRec_ ProgressRec;
struct ProgressPropsRec_
{
        LCUI_ObjectRec total;
        LCUI_ObjectRec value;
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
static void Progress_Constructor(Progress);
static LCUI_Widget Progress_Template(Progress);
static void Progress_Destructor(Progress);
static Progress Progress_New();
static void Progress_Delete(Progress);
static void Progress_BindProperty(LCUI_Widget, const char*, LCUI_Object);
static void Progress_OnPropTotalChanged(LCUI_Object, void*);
static void Progress_OnPropValueChanged(LCUI_Object, void*);
static void Progress_Constructor(Progress _this)
{
        /* CallExpression ignored */
        Number_Init(&_this->default_props.total, 0);
        Number_Init(&_this->default_props.value, 0);
        _this->props.total = _this->default_props.total;
        _this->props.value = _this->default_props.value;
}

static LCUI_Widget Progress_Template(Progress _this)
{
        LCUI_Widget widget;
        widget = LCUIWidget_New(NULL);
        Widget_SetAttribute(widget, "class", "progress");
        /* JSXText ignored */
        _this->refs.bar = LCUIWidget_New(NULL);
        Widget_SetAttribute(_this->refs.bar, "class", "bar");
        /* JSXText ignored */
        Widget_Append(widget, _this->refs.bar);
        return widget;
}

static void Progress_Destructor(Progress _this)
{
        _this->props.total = NULL;
        _this->props.value = NULL;
}

static Progress Progress_New()
{
        Progress _this;
        _this = malloc(sizeof(ProgressRec));
        if (_this == NULL)
        {
                return NULL;
        }
        Progress_Constructor(_this);
        return _this;
}

static void Progress_Delete(Progress _this)
{
        Progress_Destructor(_this);
        free(_this);
}

static void Progress_BindProperty(LCUI_Widget widget, const char *name, LCUI_Object value)
{
        _this = Widget_GetData(widget);
        if (strcmp(name, "total") == 0)
        {
                _this->props.total = value;
                Object_Watch(value, undefined, _this);
                undefined(value, _this);
        }
        else if (strcmp(name, "value") == 0)
        {
                _this->props.value = value;
                Object_Watch(value, undefined, _this);
                undefined(value, _this);
        }
}

static void Progress_OnPropTotalChanged(LCUI_Object total, void *arg)
{
        _this = arg;
}

static void Progress_OnPropValueChanged(LCUI_Object value, void *arg)
{
        _this = arg;
}
