var GearmanConnection = require("./gearman-connection");

function GearmanWorker(){
    this.server_names = [];
    this.servers = {};
    
    this.function_names = [];
    this.functions = {};
}

GearmanWorker.prototype.addServer = function(server_name, server_port){
    server_name = (server_name || "127.0.0.1").toLowerCase().trim();
    server_port = server_port || 4730;
    
    if(this.servers[server_name]){
        return;
    }
    
    this.server_names.push(server_name);
    this.servers[server_name] = {
        name: server_name,
        port: server_port,
        connection: new GearmanConnection(server_name, server_port),
        functions: []
    };
    
    this.servers[server_name].connection.on("error", function(err){
        console.log("Error with "+server_name);
        //console.log(err.message);
        console.log(err.stack);
    });
    
    this.servers[server_name].connection.on("job", this.runJob.bind(this, server_name));
    
    this.update(server_name);
}

GearmanWorker.prototype.runJob = function(server_name, handle, func_name, payload, uid){
    uid = uid || null;
    console.log(arguments);
    if(this.functions[func_name]){
        this.servers[server_name].connection.submitJob(handle, this.functions[func_name](payload));
    }else{
        this.servers[server_name].connection.submitJob(handle, 0);
    }
}

GearmanWorker.prototype.removeServer = function(server_name){
    var connection, pos;
    
    server_name = (server_name || "127.0.0.1").toLowerCase().trim();
    
    if(!this.servers[server_name]){
        return false;
    }
    
    connection = this.servers[server_name].connection;
    connection.closeConnection();
    
    if((pos = this.server_names.indexOf(server_name))>=0){
        this.server_names.splice(pos, 1);
    }
    
    delete this.servers[server_name];
    
    return true;
}


GearmanWorker.prototype.update = function(server_name){
    if(!server_name){
        return;
    }

    this.function_names.forEach((function(func_name){
        this.register(func_name, server_name);
    }).bind(this));
}

GearmanWorker.prototype.register = function(func_name, server_name){
    if(this.servers[server_name]){
        if(this.servers[server_name].functions.indexOf(func_name)<0){
            this.servers[server_name].connection.addFunction(func_name);
            this.servers[server_name].functions.push(func_name);
        }
    }else{
        this.server_names.forEach((function(server_name){
            if(server_name){
                this.register(func_name, server_name);
            }
        }).bind(this))
    }
}

GearmanWorker.prototype.unregister = function(func_name, server_name){
    var pos;
    if(this.servers[server_name]){
        if((pos = this.servers[server_name].functions.indexOf(func_name))>=0){
            this.servers[server_name].connection.removeFunction(func_name);
            this.servers[server_name].functions.splice(pos, 1);
        }
    }else{
        this.server_names.forEach((function(server_name){
            if(server_name){
                this.unregister(func_name, server_name);
            }
        }).bind(this))
    }
}

GearmanWorker.prototype.addFunction = function(name, func){
    if(!name){
        return false;
    }
    
    if(!(name in this.functions)){
        this.functions[name] = func;
        this.function_names.push(name);
        this.register(name);
    }else{
        this.functions[name] = func;
        this.function_names.push(name);
    }
    
}


GearmanWorker.prototype.removeFunction = function(name){
    var pos;
    
    if(!name){
        return false;
    }
    
    if((pos = this.function_names.indexOf(name))>=0){
        delete this.functions[name];
        this.function_names.splice(pos, 1);
        this.unregister(name);
    }
}

String.prototype.reverse = function(){
    splitext = this.split("");
    revertext = splitext.reverse();
    reversed = revertext.join("");
    return reversed;
}

worker= new GearmanWorker();
worker.addServer("localhost", 7003);
worker.addFunction("reverse", function(payload){
    var str = payload.toString("utf-8");
    return str.reverse();
});

//worker.addFunction("reverse2", "reverse_fn");

/*
setTimeout(function(){
    worker.removeFunction("reverse2");
    worker.servers.localhost.connection.sendCommand({
        type:"ECHO_RES",
        params:["ABC"],
        pipe: true})
},1000)
*/
/*
setTimeout(function(){
    worker.removeServer("localhost");
},4000)
*/

