curl --location --request POST 'https://api.thegraph.com/index-node/graphql'  --data-raw '{"query":"{ indexingStatusForPendingVersion(subgraphName: \"marlinprotocol/staking-kovan\") { subgraph fatalError { message } nonFatalErrors {message } } }"}'