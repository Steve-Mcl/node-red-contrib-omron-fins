node-red-contrib-omron-fins
===========================

<img align="left" src=images/example.png />

### Overview
This is a Node-RED node module to directly interface with OMRON PLCs over FINS Ethernet protocol. 
For now it only supports CS/CJ and CV mode for READ and WRITE operations over FINS UDP.

Credits to [Patrick Servello (patrick--)](https://github.com/patrick--) for his original implementation FINS
Credits to [Jozo132](https://github.com/Jozo132/node-omron-read.git) for his original implementation node-omron-read on which this is based

### Prerequisites for Windows

* git	(Used for repository cloning/downloads)
* node.js	(Background system for Node-RED)
* Node-RED

### Install for Windows
Make a directory for the base files on the disk (somewhere secure) and open the created folder and open PowerShell (SHIFT + right_click) or "Git Bash Here" with right mouse inside the folder. Now enter the following:
```sh
cd c:/tempsourcefolder
git clone https://...../node-red-contrib-omron-fins.git

cd ~/.node-red
npm install c:/tempsourcefolder/node-red-contrib-omron-fins
```

### Usage

* Restart Node-RED and there's the thingy now

<img align="left" src=https://github.com/Jozo132/node-red-contrib-omron-fins/blob/master/images/example1.png />

<img align="left" src=https://github.com/Jozo132/node-red-contrib-omron-fins/blob/master/images/example2.png />

<img align="left" src=https://github.com/Jozo132/node-red-contrib-omron-fins/blob/master/images/example3.png />