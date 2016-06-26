
function PerformanceProfile()
{
    this.startDate = new Date();
    this.lastDate = new Date();
    this.list = [];
    this.stack = [ new Date() ];
    
    this.mark = function(label) {
        var now = new Date();
        var lastDate = this.stack.pop();
        this.list.push({ "label": label,
                         "time": (now.getTime() - this.startDate.getTime()) / 1000,
                         "duration": (now.getTime() - lastDate.getTime()) / 1000,
                       });
        this.stack.push(now);
    }

    this.start = function(label) {
        this.stack.push(new Date());
    }

    this.stop = function(label) {
        this.stack.pop();
        this.mark(label);
    }
}

var _prof = new PerformanceProfile();
