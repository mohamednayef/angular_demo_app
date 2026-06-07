import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { TableGridComponent } from './components/table-grid/table-grid.component';

export const routes: Routes = [
    {
        path: 'table-grid',
        component: TableGridComponent
    },
    {
        path: '**',
        component: HomeComponent
    }
];
