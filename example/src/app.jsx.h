#ifdef __cplusplus
extern "C" {
#endif

typedef struct MyAppRec_* MyApp;



void MyApp_Created(MyApp _this);
LCUI_Widget MyApp_Template(MyApp _this);
MyApp MyApp_New();
void MyApp_Delete(MyApp _this);

#ifdef __cplusplus
}
#endif
