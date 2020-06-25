node-red-contrib-omron-fins
===========================

### Overview
This is a Node-RED node module to directly interface with OMRON PLCs over FINS Ethernet protocol. 
For now it only supports CS/CJ and CV mode for READ and WRITE operations over FINS UDP.

Credits to [Patrick Servello (patrick--)](https://github.com/patrick--) for his original implementation FINS
Credits to [Jozo132](https://github.com/Jozo132/node-omron-read.git) for his original implementation node-omron-read on which this is based

### Prerequisites for Windows

* git	(Used for repository cloning/downloads)
* node.js	(Background system for Node-RED)
* Node-RED

### Install

From NPM...
```sh
npm install node-red-contrib-omron-fins
```

From github...
```sh
npm install Steve-Mcl/node-red-contrib-omron-fins
```



### A working example...

#### PLC Setup
| Setting | Value |
|----|------|
| IP | 192.168.4.88 |
| MASK | 255.255.255.0 |
| Node | 88 |
| UDP | 9600 |
 

#### Node-red Setup
| Setting | Value |
|----|------|
| IP | 192.168.4.179 |
| MASK | 255.255.255.0 |


#### FINS Connection Node Settings
| Option | Value |
|----|------|
Host | 192.168.4.88
Port | 9600
MODE | CS/CJ
ICF | 0x80
DNA | 0
DA1 | 88
DA2 | 0
SNA | 0
SA1 | 179
SA2 | 0


![image](https://user-images.githubusercontent.com/44235289/85577974-9c4a7700-b631-11ea-8320-99992892b39d.png)

Other notes:
* If the subnet mask is bigger than /24 (e.g. is bigger than 255.255.255.0) you might need to enter the IP and NODE number into the **IP address table** so that the PLC understands which IP to respond to when responding to the SA1 NODE number


