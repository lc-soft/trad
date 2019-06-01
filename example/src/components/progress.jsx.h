#ifdef __cplusplus
extern "C" {
#endif

typedef struct ProgressRec_* Progress;
void Progress_BindProperty(LCUI_Widget w, const char *name, LCUI_Object value);
void Progress_Update(LCUI_Widget w);
LCUI_Widget Progress_New();
void Progress_Delete(LCUI_Widget w);
void Progress_Install();
/* Export: LCUI */
/* Export: progress_css */
/* Export: progress_class */

#ifdef __cplusplus
}
#endif
