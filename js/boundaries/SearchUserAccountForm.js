// Boundary: SearchUserAccountForm — Story 1.10 (Lim Kopi BCE, 48_User_Stories_V2.pdf)
import { SearchUserAccountC } from '../controllers/SearchUserAccountC.js';

export class SearchUserAccountForm {
  constructor(view, control = new SearchUserAccountC()) {
    this.view = view;
    this.control = control;
    this.searchKeyword = null;
  }

  async OnSearch(searchKeyword) {
    this.searchKeyword = searchKeyword;
    if (!searchKeyword || !String(searchKeyword).trim()) {     // A2: empty keyword
      this.DisplayError('Please enter a search keyword.');
      return [];
    }
    const results = await this.control.SearchUserAccount(searchKeyword);
    if (this.control.error) this.DisplayError();
    else if (results.length) this.DisplayResults(results);
    else this.DisplayNoResults();                          // A1: no matching records
    return results;
  }

  DisplayResults(results) { this.view.results(results); }

  DisplayNoResults() { this.view.noResults('No matching records found.'); }

  DisplayError(message = this.control.error) { this.view.error(message); }
}
