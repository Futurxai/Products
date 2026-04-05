import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  constructor() {}

  ngOnInit() {
    const dark = localStorage.getItem('darkMode');
    if (dark === 'true') {
      document.body.classList.add('dark');
    }
  }
}
