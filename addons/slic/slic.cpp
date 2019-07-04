#include <napi.h>
#include "slic.hpp"

extern "C" { 
#include "slicReturnExtendedFeatures.h"
}


Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  return sight::Init(env, exports);
}

NODE_API_MODULE(testaddon, InitAll)
