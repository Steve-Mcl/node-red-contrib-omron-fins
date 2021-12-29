
const NODE_PATH = '/omron-fins/';

module.exports = function (RED) {
    /**
     * Enable http route to static files
     */
    RED.httpAdmin.get(NODE_PATH + 'lib/*', function (req, res) {
        const options = {
            root: __dirname + '/lib/',
            dotfiles: 'deny'
        };
        res.sendFile(req.params[0], options);
    });
}