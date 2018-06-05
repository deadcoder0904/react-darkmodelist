import React from "react";
import { render } from "react-dom";
import AWSAppSyncClient from "aws-appsync";
import { Rehydrated } from "aws-appsync-react";
import { ApolloProvider, Query, Mutation } from "react-apollo";
import uuid from "uuid/v4";

import CREATE_APP from "./mutations/CreateApp";
import LIST_APPS from "./queries/ListApps";

require("dotenv").config();

const negativeRandom = () => Math.round(Math.random() * -1000000);
const appSyncConfig = {
  url: process.env.GRAPHQL_ENDPOINT,
  region: process.env.REGION,
  auth: {
    type: process.env.AUTH_TYPE,
    apiKey: process.env.API_KEY
  }
};
const client = new AWSAppSyncClient(appSyncConfig);

class App extends React.Component {
  state = { list: [], name: "", link: "" };
  _onChangeName = e => {
    this.setState({ name: e.target.value });
  };
  _onChangeLink = e => {
    this.setState({ link: e.target.value });
  };
  _onSubmit = createApp => {
    const { name, link } = this.state;

    if (name.length && link.length) {
      this.setState({ name: "", link: "" });
      createApp({
        variables: { id: uuid(), name, link },
        optimisticResponse: {
          __typename: "Mutation",
          createApp: {
            __typename: "App",
            id: negativeRandom(),
            name,
            link
          }
        }
      });
    }
  };
  render() {
    return (
      <React.Fragment>
        <h2>Dark Mode List</h2>
        <Mutation
          fetchPolicy="cache-and-network"
          mutation={CREATE_APP}
          update={(cache, { data: { createApp } }) => {
            console.log(createApp.id);
            const data = cache.readQuery({ query: LIST_APPS });
            data.listApps.items.push(createApp);
            cache.writeQuery({
              query: LIST_APPS,
              data
            });
          }}
        >
          {createApp => (
            <div>
              <input
                onChange={this._onChangeName}
                value={this.state.name}
                placeholder="Name"
              />
              <div />
              <input
                onChange={this._onChangeLink}
                value={this.state.link}
                placeholder="URL"
              />
              <div />
              <button onClick={() => this._onSubmit(createApp)}>Submit</button>
            </div>
          )}
        </Mutation>
        <Query query={LIST_APPS} fetchPolicy="cache-and-network">
          {({ loading, error, data }) => {
            if (loading) return <div>Loading...</div>;
            {
              console.log(loading, JSON.stringify(error), data);
            }
            if (error) return <div>Error listing apps :(</div>;
            if (!data.listApps.items.length)
              return <div>Current List is Empty</div>;
            return (
              <ul>
                {data.listApps.items.map((item, i) => {
                  if (typeof item !== "object") return null;
                  return (
                    <li key={i}>
                      <a href={item.link} target="_blank">
                        {item.name}
                      </a>
                    </li>
                  );
                })}
              </ul>
            );
          }}
        </Query>
      </React.Fragment>
    );
  }
}

const WithProvider = () => (
  <ApolloProvider client={client}>
    <Rehydrated>
      <App />
    </Rehydrated>
  </ApolloProvider>
);

render(<WithProvider />, document.getElementById("root"));
