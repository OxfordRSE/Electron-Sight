{
  'targets': [
    {
        "target_name": "sight-vlfeat",
        "cflags!": [ "-fno-exceptions" ],
        "cflags_cc!": [ "-fno-exceptions" ],
        "sources": [
            "sight-vlfeat.cpp"
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
      "dependencies": [ "sight-vlfeat" ],
      "copies": [
        {
          "files": [ "<(PRODUCT_DIR)/sight-vlfeat.node" ],
          "destination": "."
        }
      ]
    }
  ]
}
