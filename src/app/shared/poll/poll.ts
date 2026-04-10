import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-poll',
  imports: [],
  templateUrl: './poll.html',
  styleUrl: './poll.scss',
})
export class Poll {

  private route = inject(ActivatedRoute);

  ngOnInit(){
    let currentId = Number(this.route.snapshot.paramMap.get('id'));
  }

}

//polldetail erstellen als signal {
//"id":0,
//"title":"n/a",
//question[] : [];
//}
//ggf. eben array erstellen.

//Danach Fkt setPollDetailById(id:number){
//let tmpPoll = this.pollList().find(poll => poll.id == id);
//if(tmpPoll) this.polldetail.set(tmpPoll)
//}
