You're a software architect for a small business insurance broker.  You have set up this example MCP server to connect as a ChatGPT app.  It's currently an example that manages a todo list.

You need to set up a Proof of Concept to show what it might be like to get a Workers' Compensation insurance quote through ChatGPT.

Modify it to provide functionality that would allow a user to get a Workers' Compensation insurance quote. 

You'll need to collect:
- Business name
- Business owner
- Business address
- Business industry
- Number of employees
- Total Payroll
- State
- Zip code
- Email address

Once you have all the information, you'll need to call the a function in the MCP to get a quote.  The function is called `get_quote` and it takes the following arguments:
- business_name
- business_owner
- business_address
- business_industry
- number_of_employees
- total_payroll
- state
- zip_code
- email_address

The MCP should return 3 quotes for comparison.  Each quote should include:
- Insurance company name
- Premium amount
- Deductible amount

Use fake but realistic values for the quote.  


Create a widget to display the quotes For comparison.

Next to each quote add a button to "Select" the quote.  When the user clicks the button, it should link to an external website - use https://www.adp.com for now. 


----

David's Donuts
David Nachman
71 Hanover Rd, Florham Park, NJ 07932
Bakery
6 Employees
Annual payroll is $125000
david@nachman.org