{
  'targets': [
    {
        "target_name": "slic",
        "cflags!": [ "-fno-exceptions" ],
        "cflags_cc!": [ "-fno-exceptions" ],
        "sources": [
            "slicReturnExtendedFeatures.c",
            "slic.cpp"
        ],
        'include_dirs': [
            "<!@(node -p \"require('node-addon-api').include\")"
        ],
        'libraries': [],
        'dependencies': [
            "<!(node -p \"require('node-addon-api').gyp\")"
        ],
        'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ]
    },
    {
      "target_name": "action_after_build",
      "type": "none",
      "dependencies": [ "slic" ],
      "copies": [
        {
          "files": [ "<(PRODUCT_DIR)/slic.node" ],
          "destination": "."
        }
      ]
    }
  ]
}
