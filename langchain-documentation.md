# Langchain Documentation

This document contains information about Langchain, focusing on building context-aware reasoning applications.

## Core Concepts

Langchain is a framework for developing applications powered by language models. It provides tools and abstractions to create complex applications that can reason about data and take actions.

### Chains
Chains are the fundamental building block of Langchain. They allow you to combine multiple components together to create a single, coherent application.

### Agents
Agents use a language model to choose a sequence of actions to take. They can use tools to interact with their environment, and the language model is used to decide which tools to use and in what order.

### LangGraph
LangGraph is a library for building stateful, multi-actor applications with LLMs. It allows you to create and execute graphs of nodes, where each node can be a language model, a tool, or another graph.

## Building a RAG (Retrieval-Augmented Generation) Application

A common use case for Langchain is building RAG applications. These applications retrieve relevant information from a knowledge base and use it to augment the input to a language model.

**Example: Building a RAG application with LangGraph**
```python
import bs4
from langchain import hub
from langchain_community.document_loaders import WebBaseLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langgraph.graph import START, StateGraph
from typing_extensions import List, TypedDict

# Load and chunk contents of a blog post
loader = WebBaseLoader(
    web_paths=("https://lilianweng.github.io/posts/2023-06-23-agent/",),
    bs_kwargs=dict(
        parse_only=bs4.SoupStrainer(
            class_=("post-content", "post-title", "post-header")
        )
    ),
)
docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
all_splits = text_splitter.split_documents(docs)

# Index chunks into a vector store
# (Assuming vector_store is already initialized)
_ = vector_store.add_documents(documents=all_splits)

# Define prompt for question-answering
prompt = hub.pull("rlm/rag-prompt")


# Define state for application
class State(TypedDict):
    question: str
    context: List[Document]
    answer: str


# Define application steps
def retrieve(state: State):
    retrieved_docs = vector_store.similarity_search(state["question"])
    return {"context": retrieved_docs}

def generate(state: State):
    docs_content = "\n\n".join(doc.page_content for doc in state["context"])
    messages = prompt.invoke({"question": state["question"], "context": docs_content})
    response = llm.invoke(messages)
    return {"answer": response.content}


# Compile application and test
graph_builder = StateGraph(State).add_sequence([retrieve, generate])
graph_builder.add_edge(START, "retrieve")
graph = graph_builder.compile()
```
This example shows how to:
1.  Load documents from a web page.
2.  Split the documents into chunks.
3.  Index the chunks in a vector store.
4.  Define a stateful graph with `retrieve` and `generate` steps.
5.  Compile the graph into a runnable application. 