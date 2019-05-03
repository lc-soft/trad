#ifdef __cplusplus
extern "C" {
#endif

typedef struct ProgressRec_* Progress;
void Progress_BindProperty(LCUI_Widget w, const char *name, LCUI_Object value);
void Progress_OnPropTotalChanged(LCUI_Object total, void *arg);
void Progress_OnPropValueChanged(LCUI_Object value, void *arg);
LCUI_Widget Progress_Template(LCUI_Widget w);
void Progress_Update(LCUI_Widget w);
/* Export: LCUI */
/* Export: progress_class */
void LCUIWidget_AddProgress();

#ifdef __cplusplus
}
#endif
