# PowUI - Financial Dashboard

PowUI is an interface to easily interact with the Powens API. It enables you to visualize aggregated financial data for users in a Powens app and serves as a basic management interface to manage users and their connections for essential operations.

## 🌍 Demo Website

The latest development version of PowUI is available for demonstration and testing here:
**[https://powui.jehrhart.workers.dev/](https://powui.jehrhart.workers.dev/)**

> ⚠️ **This site is for testing and development purposes only.**

## Step-by-step setup:

### 🌐 Steps 1-3: Done on Powens Website

1. **Create a Powens Account:**  
   Sign up at [Powens](https://www.powens.com/) to access their banking aggregation API (free sandbox available for developers and small projects).

2. **Set Up Your Workspace and Domain:**  
   After registration, create a workspace (e.g., "my-finance-dashboard") and add a domain for your project. The domain will be the base URL of the **API URL** and a **Users Token** will be generated for this domain to let you manage the users.

3. **Add a Client Application:**  
   Add a new application (e.g., "PowUI") in your workspace. This will generate a **Client ID** and **Client Secret** needed for API authentication.

### 🖥️ Steps 4-6: Done in PowUI

4. **Configure the App:**  
   Enter your Powens credentials (API URL, Users Token, Client ID and Client Secret) in PowUI's configuration wizard.

5. **Set Up a User:**  
   Create a user through PowUI's interface. This user will be used to aggregate and access banking data. Each user needs to have a *permanent user access token*. It's created automatically for new users and it can be modified or renewed at a later time.

6. **Add New Bank Connections:**  
   Follow the connection wizard in PowUI to add your bank accounts:
   - Create a new connection for each bank you want to aggregate (make sure the `Connector` is `Activated` in Powens).
 
   Additional connections can be added later:
   - Go to the Connection Manager at the bottom of the page.
   - Click "Add New Connection".

7. 🎉 **Setup Completed**  
   You can check the accounts balance and the latest transactions.  
   Powens automatically refreshes the values periodically in the background.

## 🚀 Getting Started

### Prerequisites

- Node.js (v20.19+ or 22.12+)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## 🐳 Docker Usage

### Deploy from GitHub Container Registry

To run the latest published image:

```sh
docker run -p 3000:80 ghcr.io/Mincka/powui:latest
```

### Build the Docker image

```bash
docker build -t powui .
```

### Run the application container

```bash
docker run -p 3000:80 powui
```

- The app will be available at [http://localhost:3000](http://localhost:3000).
- You can provide your own `.env` file for API configuration (see `.env.example` for required variables).

## Understanding Powens Data Retrieval Methods

Powens uses different methods to retrieve banking information, each with different security implications:

**🔐 Data Retrieval Methods**

**Primary Method - Open Banking (PSD2 API):**

- Uses standardized European banking APIs (PSD2 regulation)
- More secure as it doesn't require sharing actual banking credentials
- Limited to banks that fully support Open Banking standards

**Secondary Method - Web Scraping/Robots:**

- For banks not supporting Open Banking or for additional account access
- Uses automated systems that connect directly to banking interfaces with your actual credentials
- **This method is significantly less secure** as it involves sharing your real banking credentials
- See [Powens Terms and Conditions](https://www.powens.com/powens-terms-and-conditions-of-use/) for detailed information about data handling and risks

**Adding Additional Accounts:**
To access more accounts from the same bank with `directaccess` method:

1. Go to the Connection Manager
2. Use the gear icon for an existing connection
3. Connect to your bank initially
4. You may be prompted to "Add more accounts" during or after the connection process
5. Follow the flow to select and authorize additional accounts

## Development Tool Notice

**PowUI is designed as a development and prototyping tool, not a production-ready aggregator.** Since it operates in Powens' sandbox environment, this application serves as a convenient way for developers to:

- Familiarize themselves with the Powens API workflows
- Test and validate their integration setup before building production applications
- Prototype user interfaces and data visualization concepts
- Understand the API's capabilities and limitations

**Sandbox Environment Limitations:**

- Bank connectors in the sandbox environment may break more frequently than in production
- Powens prioritizes connector fixes and maintenance for paying customers over free sandbox users
- Some banking institutions may have limited or unstable connectivity in sandbox mode
- Data synchronization may be less reliable compared to the production environment

**Before moving to production**, developers should implement proper backend authentication, secure credential handling, and use Powens' production environment with appropriate security measures.

## ⚠️ Security Warning

- PowUI does not include any backend server. All data is sent directly from your browser to the Powens API.
- API credentials and tokens are stored in your browser's localStorage. This is acceptable for local use, but if you deploy PowUI online, be aware that credentials could be exposed to attackers targeting your users. Do not use this application in production or on the public internet without understanding these risks.
- **Bank credentials are never handled by PowUI** - all banking authentication and credential management is handled securely by Powens through their dedicated authentication flows. PowUI only receives aggregated financial data after users have authenticated directly with their banks through Powens' secure interface.

## Disclaimer

**This project is NOT affiliated with, endorsed by, or officially connected to Powens in any way.** PowUI is an independent, third-party application developed by the community to demonstrate and facilitate interaction with Powens' publicly available API. This is an unofficial tool created for educational and development purposes.

**This software is provided "AS-IS" without any warranty, support, or guarantees.** The developers assume no liability for any issues, security breaches, data loss, or damages that may arise from using this application. Users assume all risks associated with its use.

Powens is a trademark of its respective owners. All references to Powens services and APIs are for compatibility and integration purposes only.

## Credits

This project was inspired by the blog post ["Je récupère le solde de son compte bancaire et les dernières opérations"](https://www.sigalou-domotique.fr/je-recuperer-le-solde-de-son-compte-bancaire-et-les-dernieres-operations) by [Sigalou](https://github.com/Sigalou).  
Many thanks to the author for sharing their work and providing inspiration for this application.

## License

This project is licensed under the [MIT License](./LICENSE).
