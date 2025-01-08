const path = require("path");

module.exports = {
    entry: "./public/dapp.js", // Path to your main JS file
    output: {
        filename: "bundle.js",
        path: path.resolve(__dirname, "public"), // Output file
    },
    mode: "development", // Set to "production" for production builds
    devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader", // Optional for modern JS compatibility
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
};