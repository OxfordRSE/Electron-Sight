#include <napi.h>

namespace slic {
  Napi::Array SlicWrapped(const Napi::CallbackInfo& info);
  Napi::Object Init(Napi::Env env, Napi::Object exports);
}
