#include "slic.hpp"
#include <cmath>
#include <iostream>
#include <napi.h>

extern "C" {
#include "slicReturnExtendedFeatures.h"
}

Napi::Array slic::SlicWrapped(const Napi::CallbackInfo& info)
{
  Napi::Env env = info.Env();
  if (info.Length() < 3) {
    Napi::TypeError::New(env, "expected 3 arguments").ThrowAsJavaScriptException();
  }
  if (!info[0].IsTypedArray()) {
    Napi::TypeError::New(env, "TypedArray expected for arg 1")
        .ThrowAsJavaScriptException();
  }
  if (!info[1].IsNumber()) {
    Napi::TypeError::New(env, "Number expected for arg 2").ThrowAsJavaScriptException();
  }
  if (!info[2].IsNumber()) {
    Napi::TypeError::New(env, "Number expected for arg 3").ThrowAsJavaScriptException();
  }

  int desiredSuperpixelSize = 30;
  if (info[3].IsNumber())
    desiredSuperpixelSize = info[3].As<Napi::Number>().Int64Value();

  auto data = info[0].As<Napi::TypedArrayOf<uint8_t>>().Data();
  auto width = info[1].As<Napi::Number>().Int64Value();
  auto height = info[2].As<Napi::Number>().Int64Value();

  // image in RGBA format
  const int nchannels = 4;
  const int numSuperpixels = std::round(width * height / desiredSuperpixelSize);
  const int compactness = 20;

  int* outlabels;
  int outputNumSuperpixels;
  double* outLABMeanintensities;
  int* outPixelCounts;
  int* outseedsXY;
  double* outLABVariances;
  double* outCollectedFeatures;

  slicReturnExtendedFeatures(data, width, height, nchannels, numSuperpixels,
      compactness, &outlabels, &outputNumSuperpixels, &outLABMeanintensities,
      &outPixelCounts, &outseedsXY, &outLABVariances, &outCollectedFeatures);

  auto buf_outlabels = Napi::ArrayBuffer::New(
      env, static_cast<void*>(outlabels), sizeof(int) * width * height);
  auto array_outlabels
      = Napi::TypedArrayOf<int>::New(env, width * height, buf_outlabels, 0);

  auto buf_outLABMeanintensities = Napi::ArrayBuffer::New(env,
      static_cast<void*>(outLABMeanintensities), sizeof(double) * outputNumSuperpixels);
  auto array_outLABMeanintensities = Napi::TypedArrayOf<double>::New(
      env, outputNumSuperpixels, buf_outLABMeanintensities, 0);

  auto buf_outPixelCounts = Napi::ArrayBuffer::New(
      env, static_cast<void*>(outPixelCounts), sizeof(double) * outputNumSuperpixels);
  auto array_outPixelCounts = Napi::TypedArrayOf<double>::New(
      env, outputNumSuperpixels, buf_outPixelCounts, 0);

  auto buf_outseedsXY = Napi::ArrayBuffer::New(
      env, static_cast<void*>(outseedsXY), sizeof(int) * 2 * outputNumSuperpixels);
  auto array_outseedsXY
      = Napi::TypedArrayOf<int>::New(env, outputNumSuperpixels, buf_outseedsXY, 0);

  auto buf_outLABVariances = Napi::ArrayBuffer::New(env,
      static_cast<void*>(outLABVariances), sizeof(double) * 3 * outputNumSuperpixels);
  auto array_outLABVariances = Napi::TypedArrayOf<double>::New(
      env, outputNumSuperpixels, buf_outLABVariances, 0);

  const int nfeatures = 26;
  auto buf_outCollectedFeatures
      = Napi::ArrayBuffer::New(env, static_cast<void*>(outCollectedFeatures),
          sizeof(double) * nfeatures * outputNumSuperpixels);
  auto array_outCollectedFeatures = Napi::TypedArrayOf<double>::New(
      env, nfeatures * outputNumSuperpixels, buf_outCollectedFeatures, 0);

  const int n_outputs = 6;
  auto result = Napi::Array::New(env, n_outputs);
  result.Set(0u, array_outlabels);
  result.Set(1u, array_outLABMeanintensities);
  result.Set(2u, array_outPixelCounts);
  result.Set(3u, array_outseedsXY);
  result.Set(4u, array_outLABVariances);
  result.Set(5u, array_outCollectedFeatures);
  return result;
}

Napi::Object slic::Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("slic", Napi::Function::New(env, slic::SlicWrapped));
  return exports;
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports)
{
  return slic::Init(env, exports);
}

NODE_API_MODULE(slic, InitAll)
