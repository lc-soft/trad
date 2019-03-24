#include <LCUI_Build.h>
#include <LCUI/LCUI.h>
#include <LCUI/gui/widget.h>

#include "app.h"

int main(void)
{
	MyApp app;

	LCUI_Init();

	app = MyApp_new();
	return MyApp_run(app);
}
