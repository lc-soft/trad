cmake_minimum_required(VERSION 2.8)
project(example)

set(example_VERSION_MAJOR 1)
set(example_VERSION_MINOR 0)

configure_file(
    "${PROJECT_SOURCE_DIR}/include/config.h.in"
    "${PROJECT_SOURCE_DIR}/include/config.h"
)

link_directories("${PROJECT_SOURCE_DIR}/vendor/lib/x64-windows")
include_directories(
    "${PROJECT_SOURCE_DIR}/include"
    "${PROJECT_SOURCE_DIR}/../../LCUI/include"
    "${PROJECT_SOURCE_DIR}/vendor/include"
)

aux_source_directory(src DIR_SRC)
aux_source_directory(src/components DIR_COMP)
add_executable(example ${DIR_SRC} ${DIR_COMP})

if(WIN32)
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} /SUBSYSTEM:WINDOWS")
    target_link_libraries(example LCUI LCUIMain)
else()
    target_link_libraries(example LCUI)
endif(WIN32)
