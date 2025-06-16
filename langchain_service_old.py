#!/usr/bin/env python3
"""
Integrated LangChain + Transform Service for zkEngine
Combines both services into one, running on port 8002
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
import os
import re
import subprocess
import tempfile
import uuid
from datetime import datetime
import json
import random

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.output_parsers import PydanticOutputParser
from langchain.memory import ConversationBufferMemory
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.chains import LLMChain
from langchain.schema.runnable import RunnablePassthrough

app = FastAPI(title="zkEngine Integrated Service (LangChain + Transform)")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# [Copy the rest of the integrated service code from the artifact above]
# ... (full code from the integrated service artifact)
