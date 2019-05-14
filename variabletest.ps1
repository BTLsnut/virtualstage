param(
    [int]$arg1 = 0
    )

function test(){
    If ($arg1 -eq 0){
    write-host 'too bad'
    }

    If ($arg1 -eq 1){
        calc
    }

    If ($arg1 -eq 2){ 
        notepad
    }
}
test